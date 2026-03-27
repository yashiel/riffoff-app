import { NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { validateSession, updateLastSeen } from "@/lib/gate/session";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

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

  // sessionId is guaranteed non-null beyond this point
  const validSessionId: string = sessionId;

  // For scanner role, validate with device fingerprint
  // For dashboard role, we do a lightweight check (organiser uses normal Appwrite session)
  let eventId: string;
  let gateId: string | null = null;

  if (role === "scanner") {
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

    // Update keepalive — SSE connection itself acts as heartbeat
    await updateLastSeen(validSessionId);
  } else {
    // Dashboard role — extract eventId from query param
    const eid = url.searchParams.get("eventId");
    if (!eid) {
      return new Response(JSON.stringify({ error: "eventId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    eventId = eid;
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
              Query.limit(1),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.GATE_SESSIONS, [
              Query.equal("eventId", eventId),
              Query.equal("status", "active"),
              Query.limit(100),
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.GATES, [
              Query.equal("eventId", eventId),
              Query.orderAsc("sortOrder"),
            ]),
          ]);

          // Get total tickets for the event
          let totalTickets = 0;
          try {
            const ticketsRes = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.TICKETS,
              [Query.equal("eventId", eventId), Query.limit(1)],
            );
            totalTickets = ticketsRes.total;
          } catch {
            /* optional */
          }

          // Build per-gate stats
          const gateStats = await Promise.all(
            gatesRes.documents.map(async (gate) => {
              const gateCheckins = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.GATE_CHECKINS,
                [
                  Query.equal("eventId", eventId),
                  Query.equal("gateId", gate.$id),
                  Query.equal("status", "confirmed"),
                  Query.limit(1),
                ],
              );

              const gateConflicts = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.GATE_CHECKINS,
                [
                  Query.equal("eventId", eventId),
                  Query.equal("gateId", gate.$id),
                  Query.equal("status", "conflicted"),
                  Query.limit(1),
                ],
              );

              const gateDevices = sessionsRes.documents.filter(
                (s) => s.gateId === gate.$id,
              ).length;

              // Get last scan for this gate
              let lastScan: string | undefined;
              try {
                const lastScanRes = await databases.listDocuments(
                  DATABASE_ID,
                  COLLECTIONS.GATE_CHECKINS,
                  [
                    Query.equal("eventId", eventId),
                    Query.equal("gateId", gate.$id),
                    Query.orderDesc("scannedAt"),
                    Query.limit(1),
                  ],
                );
                if (lastScanRes.documents.length > 0) {
                  lastScan = lastScanRes.documents[0].scannedAt as string;
                }
              } catch {
                /* optional */
              }

              return {
                gateId: gate.$id,
                gateName: gate.name as string,
                checkedIn: gateCheckins.total,
                devices: gateDevices,
                conflicts: gateConflicts.total,
                lastScan,
              };
            }),
          );

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

              const feed = await Promise.all(
                recentCheckins.documents.map(async (doc) => {
                  let ticketCode = "";
                  try {
                    const ticket = await databases.getDocument(
                      DATABASE_ID,
                      COLLECTIONS.TICKETS,
                      doc.ticketId as string,
                    );
                    ticketCode = (ticket.ticketCode as string) || "";
                  } catch {
                    /* ticket might be deleted */
                  }

                  const gate = gatesRes.documents.find(
                    (g) => g.$id === doc.gateId,
                  );

                  return {
                    id: doc.$id,
                    ticketCode,
                    gateName: (gate?.name as string) || "Unknown",
                    status:
                      doc.status === "confirmed"
                        ? "valid"
                        : doc.status === "conflicted"
                          ? "duplicate"
                          : "invalid",
                    timestamp: doc.scannedAt as string,
                  };
                }),
              );

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
        } catch (err) {
          // DB error — send error event but keep stream alive
          send("error", {
            message: "Temporary data fetch error",
            retryIn: 5000,
          });
        }
      }

      // Initial poll immediately
      await poll();

      // Poll every 3 seconds
      const interval = setInterval(poll, 3000);

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
