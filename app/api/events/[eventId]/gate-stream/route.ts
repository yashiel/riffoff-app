import { NextRequest } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { getGateStats } from "../gate-stats/route";
import type { EventDoc } from "@/lib/appwrite/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  // Auth check
  const sessionClient = await createSessionClient();
  if (!sessionClient) {
    return new Response("Not authenticated", { status: 401 });
  }

  try {
    const user = await sessionClient.account.get();
    const { databases } = await createAdminClient();

    const event = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    ) as unknown as EventDoc;

    const isAdmin = await isCurrentUserAdmin();
    if (event.organiserId !== user.$id && !isAdmin) {
      return new Response("Not authorized", { status: 404 });
    }
  } catch {
    return new Response("Authorization failed", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastCount = -1;

      // Send initial stats immediately
      try {
        const stats = await getGateStats(eventId);
        lastCount = stats.total.checkedIn;
        controller.enqueue(
          encoder.encode(`event: checkin\ndata: ${JSON.stringify(stats)}\n\n`),
        );
      } catch {
        // Continue polling even if initial fetch fails
      }

      const interval = setInterval(async () => {
        try {
          const stats = await getGateStats(eventId);
          if (stats.total.checkedIn !== lastCount) {
            lastCount = stats.total.checkedIn;
            controller.enqueue(
              encoder.encode(`event: checkin\ndata: ${JSON.stringify(stats)}\n\n`),
            );
          }
        } catch {
          // Silently continue on poll errors
        }
      }, 2000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
