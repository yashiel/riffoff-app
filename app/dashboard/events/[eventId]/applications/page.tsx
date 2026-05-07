import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEventById } from "@/actions/events";
import { getEventApplications } from "@/actions/applications";
import { ApplicationList } from "@/components/features/applications/ApplicationList";
import { EventApplicationsRealtime } from "@/components/features/applications/EventApplicationsRealtime";
import { serialize } from "@/lib/utils";

export const metadata = { title: "Manage Applications" };

// Always render fresh — realtime triggers router.refresh() on every queue change.
export const dynamic = "force-dynamic";

interface ApplicationsPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ApplicationsPage({ params }: ApplicationsPageProps) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) notFound();

  const applications = await getEventApplications(eventId);

  return (
    <div>
      <EventApplicationsRealtime eventId={eventId} />
      <Link
        href={`/dashboard/events/${eventId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-coral"
      >
        <ArrowLeft className="size-3.5" />
        Back to {event.title}
      </Link>
      <h2 className="font-display text-2xl sm:text-[30px]">Artist Applications</h2>
      <p className="mt-2 text-base text-muted-foreground">
        Review and manage applications for {event.title}
      </p>
      <div className="mt-8">
        <ApplicationList applications={serialize(applications)} />
      </div>
    </div>
  );
}
