import { NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { validateSession, updateLastSeen } from "@/lib/gate/session";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

// Vercel: allow up to 30s for this SSE endpoint
export const maxDuration = 30;

// ─── Module-level stats cache (shared across SSE connections) ───
// Prevents thundering herd: 1000 SSE clients → 1 DB query set per 2s, not 1000
interface CachedStats {
  total: { checkedIn: number; totalTickets: number };
  gates: Array<{ gateId: string; gateName: string; checkedIn: number; devices: number; conflicts: number; lastScan?: string }>;
  timestamp: number;
}
const statsCache = new Map<string, CachedStats>();
const STATS_CACHE_TTL_MS = 2000; // 2 seconds

/**
 * GET /api/gate/stream?token=<sessionId>&role=scanner|dashboard
 *
 * Unified SSE endpoint for real-time gate events.
 * Emits typed events:
 *   - checkin:    new check-in result (ticketCode, gate, status)
 *   - stats:      per-gate aggregated stats (checkedIn, devices, conflicts)
 *   - broadcast:  organiser message to scanner staff
 *   - session:    device connect/disconnect/revoke notifications
 *   - heartbeat:  keepalive ping (every 15s)
 *
 * Auth: query param `token` (for cross-origin scanner) OR cookie (dashboard).
 * Role: `scanner` gets broadcasts + session revocation; `dashboard` gets full stats.
 */
export async function GET(request: NextRequest) {
  // --- Auth ---
  const url = request.nextUrl;
  const tokenParam = url.searchParams.get("token");
  const role = url.searchParams.get("role") || "dashboard";

  let eventId: string;
  let gateId: string | null = null;
  let validSessionId: string = "";

  if (role === "dashboard") {
    // Dashboard role: authenticate via Appwrite user session (organiser)
    const eid = url.searchParams.get("eventId");
    if (!eid) {
      return new Response(JSON.stringify({ error: "eventId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify Appwrite session — organiser must own this event or be admin
    try {
      const sessionClient = await (await import("@/lib/appwrite/server")).createSessionClient();
      if (!sessionClient) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const user = await sessionClient.account.get();
      const { databases: adminDb } = await createAdminClient();
      const event = await adminDb.getDocument(DATABASE_ID, COLLECTIONS.EVENTS, eid);
      const isAdmin = await (await import("@/lib/auth-utils")).isCurrentUserAdmin();
      if (event.organiserId !== user.$id && !isAdmin) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: "Auth failed" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    eventId = eid;
  } else {
    // Scanner role: authenticate via gate session token
    const sessionId =
      tokenParam ||
      request.cookies.get("riffoff-gate-session")?.value ||
      (() => {
        const auth = request.headers.get("authorization");
        return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
      })();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    validSessionId = sessionId;

    const session = await validateSession(sessionId, {
      userAgent: request.headers.get("user-agent") ?? "unknown",
      screenSize: request.headers.get("x-screen-size") ?? "unknown",
      timezone: request.headers.get("x-timezone") ?? "unknown",
      language: request.headers.get("x-language") ?? "unknown",
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    eventId = session.eventId;
    gateId = session.gateId;

    // Update keepalive
    await updateLastSeen(validSessionId);
  }

  // --- SSE Stream ---
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (cancelled) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          cancelled = true;
        }
      }

      // State trackers for delta detection
      let lastCheckinCount = -1;
      let lastMessageTimestamp = new Date(
        Date.now() - 60 * 1000,
      ).toISOString();
      let lastSessionHash = "";
      let heartbeatCounter = 0;

      // Send initial connection event
      send("connected", { eventId, role, gateId });

      async function poll() {
        if (cancelled) return;

        try {
          const { databases } = await createAdminClient();

          // --- 1. Stats (always) ---
          const [checkinsRes, sessionsRes, gatesRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTIONS.GATE_CHECKINS, [
              Query.equal("eventId", eventId),
              Query.equal("status", "confirmed"),
              Query.select(["$id"]),
              Query.limit(1),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.GATE_SESSIONS, [
              Query.equal("eventId", eventId),
              Query.equal("status", "active"),
              Query.select(["$id", "gateId", "deviceId"]),
              Query.limit(100),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.GATES, [
              Query.equal("eventId", eventId),
              Query.select(["$id", "name", "sortOrder"]),
              Query.orderAsc("sortOrder"),
            ]),
          ]);

          // Get total tickets for the event
          let totalTickets = 0;
          try {
            const ticketsRes = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.TICKETS,
              [Query.equal("eventId", eventId), Query.select(["$id"]), Query.limit(1)],
            );
            totalTickets = ticketsRes.total;
          } catch {
            /* optional */
          }

          // Build per-gate stats using batched aggregation (1 query instead of 3N)
          // Check module-level cache first to avoid thundering herd
          const cached = statsCache.get(eventId);
          const now = Date.now();
          let gateStats: CachedStats["gates"];

          if (cached && now - cached.timestamp < STATS_CACHE_TTL_MS) {
            gateStats = cached.gates;
          } else {
            // Single query: fetch all checkins with minimal fields
            const allCheckins = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.GATE_CHECKINS,
              [
                Query.equal("eventId", eventId),
                Query.select(["gateId", "status", "scannedAt"]),
                Query.limit(5000),
              ],
            );

            // Aggregate in memory — O(n) single pass
            const perGate = new Map<string, { confirmed: number; conflicted: number; lastScan?: string }>();
            for (const doc of allCheckins.documents) {
              const gId = doc.gateId as string;
              if (!perGate.has(gId)) {
                perGate.set(gId, { confirmed: 0, conflicted: 0 });
              }
              const entry = perGate.get(gId)!;
              if (doc.status === "confirmed") {
                entry.confirmed++;
                const scannedAt = doc.scannedAt as string | undefined;
                if (scannedAt && (!entry.lastScan || scannedAt > entry.lastScan)) {
                  entry.lastScan = scannedAt;
                }
              } else if (doc.status === "conflicted") {
                entry.conflicted++;
              }
            }

            gateStats = gatesRes.documents.map((gate) => {
              const agg = perGate.get(gate.$id) ?? { confirmed: 0, conflicted: 0 };
              const gateDevices = sessionsRes.documents.filter(
                (s) => s.gateId === gate.$id,
              ).length;
              return {
                gateId: gate.$id,
                gateName: gate.name as string,
                checkedIn: agg.confirmed,
                devices: gateDevices,
                conflicts: agg.conflicted,
                lastScan: agg.lastScan,
              };
            });

            // Update cache
            statsCache.set(eventId, {
              total: { checkedIn: checkinsRes.total, totalTickets },
              gates: gateStats,
              timestamp: now,
            });
          }

          const currentCheckinCount = checkinsRes.total;

          // Only send stats if something changed
          if (currentCheckinCount !== lastCheckinCount) {
            send("stats", {
              total: { checkedIn: currentCheckinCount, totalTickets },
              gates: gateStats,
            });
            lastCheckinCount = currentCheckinCount;
          }

          // --- 2. Recent check-ins for live feed (dashboard only) ---
          if (role === "dashboard" && currentCheckinCount !== lastCheckinCount) {
            try {
              const recentCheckins = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.GATE_CHECKINS,
                [
                  Query.equal("eventId", eventId),
                  Query.orderDesc("scannedAt"),
                  Query.limit(10),
                ],
              );

              // Collect ticket IDs to batch-fetch tickets, then owners + tiers
              const ticketIds = recentCheckins.documents
                .map((d) => d.ticketId as string)
                .filter(Boolean);

              const ticketsMap = new Map<string, { ticketCode: string; ownerId: string; tierId: string }>();
              if (ticketIds.length > 0) {
                const ticketDocs = await Promise.all(
                  ticketIds.map((id) =>
                    databases.getDocument(DATABASE_ID, COLLECTIONS.TICKETS, id).catch(() => null),
                  ),
                );
                for (const t of ticketDocs) {
                  if (t) {
                    ticketsMap.set(t.$id, {
                      ticketCode: (t.ticketCode as string) || "",
                      ownerId: t.ownerId as string,
                      tierId: t.tierId as string,
                    });
                  }
                }
              }

              // Fetch profiles for attendee names + photos
              const ownerIds = [...new Set([...ticketsMap.values()].map((t) => t.ownerId).filter(Boolean))];
              const profileMap = new Map<string, { name: string; photo: string | null }>();
              if (ownerIds.length > 0) {
                const profileDocs = await Promise.all(
                  ownerIds.map((id) =>
                    databases
                      .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
                        Query.equal("userId", id),
                        Query.limit(1),
                      ])
                      .then((r) => r.documents[0] ?? null)
                      .catch(() => null),
                  ),
                );
                for (const p of profileDocs) {
                  if (p) {
                    profileMap.set(p.userId as string, {
                      name: (p.displayName as string) || "",
                      photo: (p.photoUrl as string) || null,
                    });
                  }
                }

                // For owners with no displayName, fetch email as fallback
                const missingIds = ownerIds.filter((id) => !profileMap.get(id)?.name);
                if (missingIds.length > 0) {
                  try {
                    const adminClient = await createAdminClient();
                    const userDocs = await Promise.all(
                      missingIds.map((id) => adminClient.users.get(id).catch(() => null)),
                    );
                    for (const u of userDocs) {
                      if (u?.email) {
                        const existing = profileMap.get(u.$id);
                        if (existing) {
                          existing.name = u.email;
                        } else {
                          profileMap.set(u.$id, { name: u.email, photo: null });
                        }
                      }
                    }
                  } catch { /* email fallback non-critical */ }
                }
              }

              // Fetch tier names
              const tierIds = [...new Set([...ticketsMap.values()].map((t) => t.tierId).filter(Boolean))];
              const tierMap = new Map<string, string>();
              if (tierIds.length > 0) {
                const tierDocs = await Promise.all(
                  tierIds.map((id) =>
                    databases.getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, id).catch(() => null),
                  ),
                );
                for (const t of tierDocs) {
                  if (t) tierMap.set(t.$id, (t.name as string) || "—");
                }
              }

              const feed = recentCheckins.documents.map((doc) => {
                const ticket = ticketsMap.get(doc.ticketId as string);
                const gate = gatesRes.documents.find(
                  (g) => g.$id === doc.gateId,
                );
                const profile = ticket ? profileMap.get(ticket.ownerId) : undefined;

                return {
                  id: doc.$id,
                  ticketCode: ticket?.ticketCode || "",
                  gateName: (gate?.name as string) || "Unknown",
                  status:
                    doc.status === "confirmed"
                      ? "valid"
                      : doc.status === "conflicted"
                        ? "duplicate"
                        : "invalid",
                  timestamp: doc.scannedAt as string,
                  attendeeName: profile?.name || "Guest",
                  attendeePhotoUrl: profile?.photo || null,
                  tierName: ticket ? tierMap.get(ticket.tierId) || null : null,
                };
              });

              send("feed", feed);
            } catch {
              /* feed is supplementary */
            }
          }

          // --- 3. Broadcast messages (scanner + dashboard) ---
          try {
            const msgQueries = [
              Query.equal("eventId", eventId),
              Query.greaterThan("$createdAt", lastMessageTimestamp),
              Query.orderDesc("$createdAt"),
              Query.limit(5),
            ];

            const messagesRes = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.GATE_MESSAGES,
              msgQueries,
            );

            if (messagesRes.documents.length > 0) {
              // Filter by gateId for scanner role
              const relevantMsgs = messagesRes.documents.filter((msg) => {
                if (role === "dashboard") return true;
                // Scanner: show all-gate messages + messages for this gate
                return !msg.gateId || msg.gateId === gateId;
              });

              for (const msg of relevantMsgs) {
                send("broadcast", {
                  id: msg.$id,
                  message: msg.message as string,
                  gateId: (msg.gateId as string) || null,
                  createdAt: msg.$createdAt,
                });
              }

              lastMessageTimestamp =
                messagesRes.documents[0].$createdAt as string;
            }
          } catch {
            /* messages are supplementary */
          }

          // --- 4. Session changes (scanner: detect own revocation; dashboard: device list) ---
          const sessionHash = sessionsRes.documents
            .map((s) => `${s.$id}:${s.status}:${s.lastSeenAt}`)
            .sort()
            .join("|");

          if (sessionHash !== lastSessionHash) {
            if (role === "dashboard") {
              // Send full device list
              const devices = sessionsRes.documents.map((s) => ({
                sessionId: s.$id,
                deviceId: s.deviceId as string,
                gateId: s.gateId as string,
                status: s.status as string,
                lastSeenAt: s.lastSeenAt as string,
                userAgent: (s.userAgent as string) || "",
                screenSize: (s.screenSize as string) || "",
                timezone: (s.timezone as string) || "",
                language: (s.language as string) || "",
                deviceFingerprint: (s.deviceFingerprint as string) || "",
                issuedBy: (s.issuedBy as string) || "",
                createdAt: s.$createdAt as string,
              }));
              send("devices", devices);
            } else {
              // Scanner: check if OWN session was revoked
              const mySession = sessionsRes.documents.find(
                (s) => s.$id === validSessionId,
              );
              if (!mySession) {
                send("revoked", { reason: "Session revoked by organiser" });
                cancelled = true;
                controller.close();
                return;
              }
            }
            lastSessionHash = sessionHash;
          }

          // --- 5. Keepalive heartbeat (every ~15s = 5 poll cycles at 3s interval) ---
          heartbeatCounter++;
          if (heartbeatCounter % 5 === 0) {
            send("heartbeat", { serverTime: new Date().toISOString() });

            // For scanner, also update lastSeen
            if (role === "scanner") {
              try {
                await updateLastSeen(validSessionId);
              } catch {
                /* non-critical */
              }
            }
          }
        } catch {
          // DB error — send error event but keep stream alive
          send("error", {
            message: "Temporary data fetch error",
            retryIn: 5000,
          });
        }
      }

      // Initial poll immediately
      await poll();

      // Poll every 3 seconds, but close after ~25s to stay within
      // Vercel serverless function timeout. Client will auto-reconnect.
      const MAX_DURATION_MS = 25_000;
      const startTime = Date.now();
      const interval = setInterval(async () => {
        if (Date.now() - startTime > MAX_DURATION_MS) {
          // Graceful close — send a reconnect hint
          send("heartbeat", { serverTime: new Date().toISOString(), reconnect: true });
          clearInterval(interval);
          cancelled = true;
          try {
            controller.close();
          } catch { /* already closed */ }
          return;
        }
        await poll();
      }, 3000);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        cancelled = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
