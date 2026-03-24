import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getEventTiers } from "@/actions/tiers";
import { getEventById } from "@/actions/events";
import { TierCard } from "@/components/features/events/TierCard";
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
      <h2 className="font-display text-2xl sm:text-[36px]">Ticket Tiers</h2>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Manage pricing and availability for {event.title}
      </p>

      {/* Existing tiers */}
      <div className="mt-8 space-y-3">
        {tiers.map((tier) => (
          <TierCard key={tier.$id} tier={tier} />
        ))}
      </div>

      {/* Add new tier form */}
      <div className="mt-8">
        <h3 className="mb-3 flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground">
          <Plus className="size-4" />
          Add new tier
        </h3>
        <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-card p-4">
          <TierForm eventId={eventId} />
        </div>
      </div>
    </div>
  );
}
