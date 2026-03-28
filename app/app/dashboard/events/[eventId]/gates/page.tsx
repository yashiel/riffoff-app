import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, DoorOpen, Radio } from "lucide-react";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { listGates, listActiveSessions } from "@/actions/gate";
import { GateList } from "./gate-list";
import type { EventDoc } from "@/lib/appwrite/types";

export const dynamic = "force-dynamic";

interface GatesPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: GatesPageProps) {
  const { eventId } = await params;
  return { title: `Gate Management — ${eventId}` };
}

export default async function GatesPage({ params }: GatesPageProps) {
  const { eventId } = await params;

  // Auth check
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

  // Fetch gates and active sessions in parallel
  const [gates, sessions] = await Promise.all([
    listGates(eventId),
    listActiveSessions(eventId).catch(() => []),
  ]);

  // Count active devices per gate
  const deviceCountByGate: Record<string, number> = {};
  for (const s of sessions) {
    const gId = (s as Record<string, unknown>).gateId as string;
    if (gId) {
      deviceCountByGate[gId] = (deviceCountByGate[gId] ?? 0) + 1;
    }
  }

  // Serialize gate data for client component
  const serializedGates = gates.map((g: unknown) => {
    const doc = g as Record<string, unknown>;
    return {
      gateId: doc.$id as string,
      name: (doc.name as string) ?? "",
      capacity: (doc.capacity as number) ?? 0,
      maxDevices: (doc.maxDevices as number) ?? 0,
      sortOrder: (doc.sortOrder as number) ?? 0,
      status: (doc.status as string) ?? "open",
      activeDevices: deviceCountByGate[doc.$id as string] ?? 0,
    };
  });

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href={`/dashboard/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-coral"
      >
        <ChevronLeft className="size-3.5" />
        Back to event
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-muted sm:size-12">
            <DoorOpen className="size-5 text-muted-foreground sm:size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-tight sm:text-3xl lg:text-4xl">
              Gate Management
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Configure entry gates and generate access codes for{" "}
              <span className="font-medium text-muted-foreground">{event.title}</span>
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/events/${eventId}/gate-control`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-coral/10 px-4 py-2 text-base font-medium text-coral transition-colors hover:bg-coral/20"
        >
          <Radio className="size-4" />
          Live Control
        </Link>
      </div>

      {/* Gate list (client component) */}
      <GateList eventId={eventId} initialGates={serializedGates} />
    </div>
  );
}
