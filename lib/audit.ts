"use server";

import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

/**
 * Create an audit log entry. Fire-and-forget — never blocks the main action.
 * Used across all Server Actions for compliance and debugging.
 */
export async function createAuditLog(input: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { databases } = await createAdminClient();
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    );
  } catch {
    // Audit logging must never break the main flow
    console.error(`[AUDIT] Failed to log: ${input.action} on ${input.entityType}/${input.entityId}`);
  }
}
