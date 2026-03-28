import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Radio, Settings } from "lucide-react";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { listGates } from "@/actions/gate";
import { CommandCenter } from "@/components/features/gate-control/CommandCenter";
import { serialize } from "@/lib/utils";
import type { EventDoc } from "@/lib/appwrite/types";

export const dynamic = "force-dynamic";

interface GateControlPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: GateControlPageProps) {
  const { eventId } = await params;
  return { title: `Gate Control — ${eventId}` };
}

export default async function GateControlPage({ params }: GateControlPageProps) {
  const { eventId } = await params;

  const sessionClient = await createSessionClient();
  if (!sessionClient) notFound();
  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    )) as unknown as EventDoc;
  } catch {
    notFound();
  }

  const isAdmin = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !isAdmin) notFound();

  const gates = await listGates(eventId);

  return (
    <div className="space-y-8">
      {/* Navigation + header */}
      <div>
        <Link
          href={`/dashboard/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-coral"
        >
          <ChevronLeft className="size-3.5" />
          Back to Event
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-coral/10 sm:size-12">
              <Radio className="size-5 text-coral sm:size-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl tracking-tight sm:text-3xl lg:text-4xl">
                Gate Control
              </h1>
              <p className="mt-1 text-base text-muted-foreground">
                Real-time command center for{" "}
                <span className="font-medium text-muted-foreground">{event.title}</span>
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/events/${eventId}/gates`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/80 px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="size-4" />
            Manage Gates
          </Link>
        </div>
      </div>

      <CommandCenter
        eventId={eventId}
        gates={
          serialize(gates) as unknown as Array<{
            $id: string;
            name: string;
            status: string;
            capacity: number;
            [key: string]: unknown;
          }>
        }
      />
    </div>
  );
}
