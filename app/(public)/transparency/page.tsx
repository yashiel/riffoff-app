import type { Metadata } from "next";
import { Query } from "node-appwrite";
import {
  Shield,
  AlertTriangle,
  Gavel,
  Scale,
  FileWarning,
  Ban,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

export const metadata: Metadata = {
  title: "Transparency Report | RiffOff",
  description:
    "See how RiffOff keeps the platform safe. Monthly moderation statistics including reports, enforcement actions, and appeals — no personally identifiable information.",
};

// Revalidate every hour so data stays reasonably fresh
export const revalidate = 3600;

// ─── Helpers ──────────────────────────────────────────

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

// ─── Stat Card ────────────────────────────────────────

function StatCard({
  value,
  label,
  icon: Icon,
}: {
  value: string | number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/30 p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────

export default async function TransparencyReportPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nowISO = now.toISOString();

  const { databases } = await createAdminClient();

  // Fetch all aggregate counts in parallel — limit(1) to get .total only
  const [
    totalReportsRes,
    actionedRes,
    dismissedRes,
    eventsSuspendedRes,
    usersWarnedRes,
    usersTempBannedRes,
    usersPermanentBannedRes,
    appealsFiledRes,
    appealsOverturnedRes,
  ] = await Promise.all([
    // Reports created this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
      Query.greaterThanEqual("$createdAt", monthStart),
      Query.lessThanEqual("$createdAt", nowISO),
      Query.limit(1),
    ]),
    // Actioned this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
      Query.equal("status", "actioned"),
      Query.greaterThanEqual("resolvedAt", monthStart),
      Query.limit(1),
    ]),
    // Dismissed this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
      Query.equal("status", "dismissed"),
      Query.greaterThanEqual("resolvedAt", monthStart),
      Query.limit(1),
    ]),
    // Events suspended this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
      Query.contains("actionTaken", "event_suspended"),
      Query.greaterThanEqual("resolvedAt", monthStart),
      Query.limit(1),
    ]),
    // Warnings issued this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.USER_WARNINGS, [
      Query.equal("level", "warning"),
      Query.greaterThanEqual("$createdAt", monthStart),
      Query.lessThanEqual("$createdAt", nowISO),
      Query.limit(1),
    ]),
    // Temp bans this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.USER_WARNINGS, [
      Query.equal("level", "temp_ban"),
      Query.greaterThanEqual("$createdAt", monthStart),
      Query.lessThanEqual("$createdAt", nowISO),
      Query.limit(1),
    ]),
    // Permanent bans this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.USER_WARNINGS, [
      Query.equal("level", "permanent_ban"),
      Query.greaterThanEqual("$createdAt", monthStart),
      Query.lessThanEqual("$createdAt", nowISO),
      Query.limit(1),
    ]),
    // Appeals filed this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.APPEALS, [
      Query.greaterThanEqual("$createdAt", monthStart),
      Query.lessThanEqual("$createdAt", nowISO),
      Query.limit(1),
    ]),
    // Appeals overturned this month
    databases.listDocuments(DATABASE_ID, COLLECTIONS.APPEALS, [
      Query.equal("status", "overturned"),
      Query.greaterThanEqual("$createdAt", monthStart),
      Query.lessThanEqual("$createdAt", nowISO),
      Query.limit(1),
    ]),
  ]);

  const totalReports = totalReportsRes.total;
  const actioned = actionedRes.total;
  const dismissed = dismissedRes.total;
  const eventsSuspended = eventsSuspendedRes.total;
  const usersWarned = usersWarnedRes.total;
  const usersTempBanned = usersTempBannedRes.total;
  const usersPermanentBanned = usersPermanentBannedRes.total;
  const appealsFiled = appealsFiledRes.total;
  const appealsOverturned = appealsOverturnedRes.total;

  const actionRate = pct(actioned, actioned + dismissed);
  const overturnRate = pct(appealsOverturned, appealsFiled);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/30 px-4 py-1.5 text-sm font-medium text-muted-foreground">
          <Shield className="size-4" />
          Updated monthly
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Transparency Report
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          How we keep RiffOff safe — real moderation data, no personally
          identifiable information.
        </p>
        <p className="mt-2 text-sm font-semibold text-coral">
          {formatMonth(now)}
        </p>
      </div>

      {/* Stats sections */}
      <div className="space-y-10">
        {/* Reports & Actions */}
        <Section title="Reports & Actions">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              value={totalReports}
              label="Reports Received"
              icon={FileWarning}
            />
            <StatCard
              value={actioned}
              label="Actions Taken"
              icon={Gavel}
            />
            <StatCard
              value={dismissed}
              label="Dismissed"
              icon={RotateCcw}
            />
            <StatCard
              value={actionRate}
              label="Action Rate"
              icon={AlertTriangle}
            />
          </div>
        </Section>

        <div className="border-t border-border/40" />

        {/* Enforcement */}
        <Section title="Enforcement">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              value={eventsSuspended}
              label="Events Suspended"
              icon={ShieldAlert}
            />
            <StatCard
              value={usersWarned}
              label="Warnings Issued"
              icon={AlertTriangle}
            />
            <StatCard
              value={usersTempBanned}
              label="Temporary Bans"
              icon={Ban}
            />
            <StatCard
              value={usersPermanentBanned}
              label="Permanent Bans"
              icon={Ban}
            />
          </div>
        </Section>

        <div className="border-t border-border/40" />

        {/* Appeals */}
        <Section title="Appeals">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              value={appealsFiled}
              label="Appeals Filed"
              icon={Scale}
            />
            <StatCard
              value={appealsOverturned}
              label="Overturned"
              icon={RotateCcw}
            />
            <StatCard
              value={overturnRate}
              label="Overturn Rate"
              icon={Scale}
            />
          </div>
        </Section>

        <div className="border-t border-border/40" />

        {/* Our Commitment */}
        <section className="rounded-xl border border-border/50 bg-card/30 p-6">
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
            Our Commitment
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            RiffOff is committed to maintaining a safe and fair platform for
            music lovers, artists, and organisers. This report is generated
            automatically from our moderation data and contains no personally
            identifiable information.
          </p>
        </section>
      </div>
    </div>
  );
}
