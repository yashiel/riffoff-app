import { ApplicationCard } from "./ApplicationCard";
import { EmptyState } from "@/components/features/shared/EmptyState";
import type { ApplicationWithArtist } from "@/actions/applications";

interface ApplicationListProps {
  applications: ApplicationWithArtist[];
}

const STATUS_ORDER = ["submitted", "shortlisted", "accepted", "rejected", "withdrawn"] as const;
const STATUS_LABELS: Record<string, string> = {
  submitted: "New Applications",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function ApplicationList({ applications }: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Artists will appear here when they apply to perform at your event."
      />
    );
  }

  // Group by status
  const grouped = new Map<string, ApplicationWithArtist[]>();
  for (const status of STATUS_ORDER) {
    const items = applications.filter((a) => a.status === status);
    if (items.length > 0) grouped.set(status, items);
  }

  return (
    <div className="space-y-8">
      {[...grouped.entries()].map(([status, apps]) => (
        <div key={status}>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-display text-[22px]">
              {STATUS_LABELS[status] ?? status}
            </h3>
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[12px] text-muted-foreground">
              {apps.length}
            </span>
          </div>
          <div className="space-y-3">
            {apps.map((app) => (
              <ApplicationCard key={app.$id} application={app} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
