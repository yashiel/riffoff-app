import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { getEventTiers } from "@/actions/tiers";
import { getEventById } from "@/actions/events";
import { SortableTierList } from "@/components/features/events/SortableTierList";
import { TierForm } from "@/components/features/events/TierForm";
import { serialize } from "@/lib/utils";

export const metadata = { title: "Manage Tiers" };

interface TiersPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function TiersPage({ params }: TiersPageProps) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) notFound();

  const tiers = serialize(await getEventTiers(eventId));

  return (
    <div>
      <Link
        href={`/dashboard/events/${eventId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-coral"
      >
        <ArrowLeft className="size-3.5" />
        Back to {event.title}
      </Link>

      <h2 className="font-display text-2xl sm:text-[36px]">Ticket Tiers</h2>
      <p className="mt-2 text-base text-muted-foreground">
        Drag to reorder · Manage pricing for {event.title}
      </p>

      {/* Sortable tier list with drag-and-drop */}
      <div className="mt-8">
        <SortableTierList tiers={tiers} eventId={eventId} />
      </div>

      {/* Add new tier form */}
      <div className="mt-8">
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-medium text-muted-foreground">
          <Plus className="size-4" />
          Add new tier
        </h3>
        <div className="rounded-xl border border-[var(--border)] bg-card p-4">
          <TierForm eventId={eventId} />
        </div>
      </div>
    </div>
  );
}
