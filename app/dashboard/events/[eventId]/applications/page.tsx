import { notFound } from "next/navigation";
import { getEventById } from "@/actions/events";
import { getEventApplications } from "@/actions/applications";
import { ApplicationList } from "@/components/features/applications/ApplicationList";
import { serialize } from "@/lib/utils";

export const metadata = { title: "Manage Applications" };

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
      <h2 className="font-display text-[30px]">Artist Applications</h2>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Review and manage applications for {event.title}
      </p>
      <div className="mt-8">
        <ApplicationList applications={serialize(applications)} />
      </div>
    </div>
  );
}
