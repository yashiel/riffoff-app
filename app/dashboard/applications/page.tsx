import { getMyApplications } from "@/actions/artist-applications";
import { ArtistApplicationCard } from "@/components/features/applications/ArtistApplicationCard";
import { EmptyState } from "@/components/features/shared/EmptyState";

export const metadata = { title: "My Applications" };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  let applications: Awaited<ReturnType<typeof getMyApplications>> = [];
  try {
    applications = await getMyApplications();
  } catch {
    // Not authenticated
  }

  const statusGroups = {
    active: applications.filter(
      (a) => a.status === "submitted" || a.status === "shortlisted",
    ),
    accepted: applications.filter((a) => a.status === "accepted"),
    closed: applications.filter(
      (a) => a.status === "rejected" || a.status === "withdrawn",
    ),
  };

  return (
    <div>
      <h1 className="font-display text-[36px]">My Applications</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Track your performance applications
      </p>

      <div className="mt-8">
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Browse published events and apply to perform."
            actionLabel="Browse Events"
            actionHref="/events"
          />
        ) : (
          <div className="space-y-8">
            {statusGroups.active.length > 0 && (
              <Section title="Active" count={statusGroups.active.length}>
                {statusGroups.active.map((app) => (
                  <ArtistApplicationCard key={app.$id} application={app} />
                ))}
              </Section>
            )}
            {statusGroups.accepted.length > 0 && (
              <Section title="Accepted" count={statusGroups.accepted.length}>
                {statusGroups.accepted.map((app) => (
                  <ArtistApplicationCard key={app.$id} application={app} />
                ))}
              </Section>
            )}
            {statusGroups.closed.length > 0 && (
              <Section title="Closed" count={statusGroups.closed.length}>
                {statusGroups.closed.map((app) => (
                  <ArtistApplicationCard key={app.$id} application={app} />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-display text-[18px]">{title}</h3>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[12px] text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
