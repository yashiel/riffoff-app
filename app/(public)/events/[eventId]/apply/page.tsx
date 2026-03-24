import { notFound, redirect } from "next/navigation";
import { getEventById } from "@/actions/events";
import { getProfile } from "@/actions/profiles";
import { ApplyForm } from "@/components/features/applications/ApplyForm";

interface ApplyPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: ApplyPageProps) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  return { title: event ? `Apply: ${event.title}` : "Apply" };
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { eventId } = await params;

  const [event, profile] = await Promise.all([
    getEventById(eventId),
    getProfile(),
  ]);

  if (!event) notFound();
  if (!profile) redirect(`/login?redirect=/events/${eventId}/apply`);

  // Must be an artist to apply
  if (profile.role !== "artist") {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h1 className="font-display text-[36px]">Artist Account Required</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          You need an artist account to apply to perform at events.
          Upgrade your profile to become an artist first.
        </p>
        <a href="/dashboard/profile" className="btn-primary mt-6 inline-block">
          Go to Profile Settings
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="font-display text-[36px]">Apply to Perform</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Submit your application to the event organiser
      </p>
      <div className="mt-8">
        <ApplyForm eventId={eventId} eventTitle={event.title} />
      </div>
    </div>
  );
}
