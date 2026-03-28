import { redirect, notFound } from "next/navigation";
import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { serialize, formatDate } from "@/lib/utils";
import { AppealForm } from "@/components/features/moderation/AppealForm";
import type { ModerationItemDoc, AppealDoc } from "@/lib/appwrite/types";

export const dynamic = "force-dynamic";

export default async function AppealPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;

  // Auth
  const sessionClient = await createSessionClient();
  if (!sessionClient) redirect("/login");

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Fetch moderation item
  let item: ModerationItemDoc;
  try {
    item = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      itemId,
    )) as unknown as ModerationItemDoc;
  } catch {
    notFound();
  }

  // Must be actioned
  if (item.status !== "actioned") {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <h1 className="font-display text-2xl sm:text-3xl">Appeal</h1>
        <div className="mt-6 rounded-lg border border-[var(--border)] py-12 text-center">
          <p className="text-muted-foreground">
            Only actioned moderation items can be appealed.
          </p>
        </div>
      </div>
    );
  }

  // Verify the user is the affected party (check entity ownership)
  let isAffected = false;
  try {
    switch (item.entityType) {
      case "user":
        isAffected = item.entityId === user.$id;
        break;
      case "event": {
        const ev = await databases.getDocument(DATABASE_ID, COLLECTIONS.EVENTS, item.entityId);
        isAffected = (ev as unknown as { organiserId: string }).organiserId === user.$id;
        break;
      }
      case "message": {
        const msg = await databases.getDocument(DATABASE_ID, COLLECTIONS.MESSAGES, item.entityId);
        isAffected = (msg as unknown as { senderId: string }).senderId === user.$id;
        break;
      }
      case "review": {
        const rating = await databases.getDocument(DATABASE_ID, COLLECTIONS.EVENT_RATINGS, item.entityId);
        isAffected = (rating as unknown as { userId: string }).userId === user.$id;
        break;
      }
    }
  } catch {
    // Entity may have been deleted
  }

  if (!isAffected) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <h1 className="font-display text-2xl sm:text-3xl">Appeal</h1>
        <div className="mt-6 rounded-lg border border-[var(--border)] py-12 text-center">
          <p className="text-muted-foreground">
            You can only appeal actions taken against you.
          </p>
        </div>
      </div>
    );
  }

  // Check for existing appeal
  const { documents: existingAppeals } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.APPEALS,
    [
      Query.equal("moderationItemId", itemId),
      Query.limit(1),
    ],
  );

  const existingAppeal = existingAppeals[0]
    ? serialize(existingAppeals[0] as unknown as AppealDoc)
    : null;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="font-display text-2xl sm:text-3xl">Appeal a Moderation Action</h1>
      <p className="mt-2 text-base text-muted-foreground">
        If you believe this action was taken in error, you can submit an appeal.
      </p>

      {/* Action details */}
      <div className="mt-6 rounded-lg border border-[var(--border)] p-4">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Action Details</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Action</span>
            <span className="font-medium capitalize text-foreground">
              {(item.actionTaken ?? "Unknown").replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Reason</span>
            <span className="capitalize text-foreground">{item.reason}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="text-foreground">
              {item.resolvedAt ? formatDate(item.resolvedAt) : "Unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* Appeal form or status */}
      <div className="mt-6">
        {existingAppeal ? (
          <div className="rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-lg font-medium text-foreground">Appeal Status</h2>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                    existingAppeal.status === "overturned"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : existingAppeal.status === "upheld"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {existingAppeal.status.replace(/_/g, " ")}
                </span>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Your appeal reason:</p>
                <p className="mt-1 text-sm text-foreground">{existingAppeal.reason}</p>
              </div>

              {existingAppeal.reviewNote && (
                <div>
                  <p className="text-sm text-muted-foreground">Reviewer note:</p>
                  <p className="mt-1 text-sm text-foreground">{existingAppeal.reviewNote}</p>
                </div>
              )}

              {existingAppeal.resolvedAt && (
                <p className="text-xs text-muted-foreground">
                  Resolved on {formatDate(existingAppeal.resolvedAt)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <AppealForm
            moderationItemId={itemId}
            actionTaken={item.actionTaken ?? "Unknown"}
            reason={item.reason}
          />
        )}
      </div>
    </div>
  );
}
