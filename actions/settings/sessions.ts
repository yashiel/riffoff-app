"use server";

import { createSessionClient } from "@/lib/appwrite/server";
import { checkSensitiveRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { cookies } from "next/headers";

export interface SessionInfo {
  id: string;
  device: string;
  os: string;
  ip: string;
  country: string;
  current: boolean;
  createdAt: string;
}

/** List all active sessions for the current user */
export async function listMySessions(): Promise<SessionInfo[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  try {
    const sessions = await sessionClient.account.listSessions();
    const cookieStore = await cookies();
    const currentSessionSecret = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    return sessions.sessions.map((s) => ({
      id: s.$id,
      device: s.deviceName || s.clientName || "Unknown device",
      os: s.osName || "Unknown OS",
      ip: s.ip || "—",
      country: s.countryName || "—",
      current: s.secret === currentSessionSecret,
      createdAt: s.$createdAt,
    }));
  } catch {
    return [];
  }
}

/** Revoke a specific session (cannot revoke current) */
export async function revokeSession(
  sessionId: string,
): Promise<{ error?: string; success?: boolean }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = await checkSensitiveRateLimit(user.$id);
  if (!rateCheck.allowed) return { error: "Too many attempts. Try again later." };

  // Check it's not the current session
  const sessions = await listMySessions();
  const target = sessions.find((s) => s.id === sessionId);
  if (!target) return { error: "Session not found" };
  if (target.current) return { error: "Cannot revoke your current session. Use logout instead." };

  try {
    await sessionClient.account.deleteSession(sessionId);

    await createAuditLog({
      actorId: user.$id,
      action: "profile.session_revoked",
      entityType: "session",
      entityId: sessionId,
      metadata: { device: target.device, ip: target.ip },
    });

    return { success: true };
  } catch {
    return { error: "Failed to revoke session" };
  }
}

/** Revoke all sessions except the current one */
export async function revokeAllOtherSessions(): Promise<{ error?: string; success?: boolean }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = await checkSensitiveRateLimit(user.$id);
  if (!rateCheck.allowed) return { error: "Too many attempts. Try again later." };

  try {
    // Get all sessions, delete non-current ones individually
    const sessions = await listMySessions();
    const otherSessions = sessions.filter((s) => !s.current);

    for (const session of otherSessions) {
      await sessionClient.account.deleteSession(session.id).catch(() => {});
    }

    await createAuditLog({
      actorId: user.$id,
      action: "profile.all_sessions_revoked",
      entityType: "user",
      entityId: user.$id,
      metadata: { revokedCount: otherSessions.length },
    });

    return { success: true };
  } catch {
    return { error: "Failed to revoke sessions" };
  }
}
