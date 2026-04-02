import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/features/shared/LegalPageLayout";

export const metadata: Metadata = {
  title: "Data Deletion | RiffOff",
  description: "How to request deletion of your personal data and RiffOff account.",
};

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-24">
      <h2 className="mb-4 flex items-baseline gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
        <span className="text-coral/60">{num}.</span>
        {title}
      </h2>
      <div className="space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-2 block size-1.5 shrink-0 rounded-full bg-coral/40" />
      <span>{children}</span>
    </li>
  );
}

export default function DataDeletionPage() {
  return (
    <LegalPageLayout
      title="Data Deletion"
      subtitle="Request Removal of Your Data"
      lastUpdated="30 March 2026"
      icon="privacy"
    >
      <div className="space-y-10">
        {/* Intro */}
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 text-base leading-relaxed text-muted-foreground">
          <p>
            At RiffOff, we respect your right to control your personal data. This page explains how you can
            request the deletion of your account and all associated data from our platform.
          </p>
          <p className="mt-3">
            This policy applies to all users of the RiffOff platform, including attendees, event organisers,
            and artists. It covers data processed in accordance with our{" "}
            <Link href="/privacy" className="font-medium text-coral hover:underline">Privacy Policy</Link>.
          </p>
        </div>

        <Section num="1" title="How to Request Data Deletion">
          <p>You can request deletion of your account and personal data through any of the following methods:</p>

          <SubSection title="1.1 Through the App">
            <ul className="space-y-2">
              <Li>Navigate to <strong className="text-foreground">Settings</strong> in the RiffOff app or website.</Li>
              <Li>Select <strong className="text-foreground">Privacy &amp; Data</strong>.</Li>
              <Li>Click <strong className="text-foreground">&ldquo;Delete My Account&rdquo;</strong>.</Li>
              <Li>Confirm your identity by entering your password or completing email verification.</Li>
              <Li>Your account will be scheduled for deletion.</Li>
            </ul>
          </SubSection>

          <SubSection title="1.2 Via Email">
            <p>
              Send a deletion request to{" "}
              <a href="mailto:privacy@riffoff.live" className="font-medium text-coral hover:underline">privacy@riffoff.live</a>{" "}
              with the subject line <strong className="text-foreground">&ldquo;Data Deletion Request&rdquo;</strong>. Include:
            </p>
            <ul className="mt-2 space-y-2">
              <Li>Your registered email address.</Li>
              <Li>Your full name as it appears on your account.</Li>
              <Li>A brief statement requesting deletion of your data.</Li>
            </ul>
            <p className="mt-2">We will verify your identity before processing the request.</p>
          </SubSection>

          <SubSection title="1.3 For Facebook or Google Login Users">
            <p>
              If you signed up using Facebook Login or Google Sign-In, you can also request data deletion
              directly from those platforms:
            </p>
            <ul className="mt-2 space-y-2">
              <Li>
                <strong className="text-foreground">Facebook:</strong> Go to{" "}
                <span className="text-foreground">Settings &amp; Privacy &gt; Settings &gt; Apps and Websites</span>{" "}
                on Facebook, find RiffOff, and click &ldquo;Remove&rdquo;. This will notify us to delete your data.
              </Li>
              <Li>
                <strong className="text-foreground">Google:</strong> Go to{" "}
                <span className="text-foreground">myaccount.google.com &gt; Security &gt; Third-party apps</span>,{" "}
                find RiffOff, and revoke access. Then email us at{" "}
                <a href="mailto:privacy@riffoff.live" className="font-medium text-coral hover:underline">privacy@riffoff.live</a>{" "}
                to complete the deletion.
              </Li>
            </ul>
          </SubSection>
        </Section>

        <Section num="2" title="What Data Is Deleted">
          <p>When your deletion request is processed, we permanently remove the following:</p>

          <div className="mt-4 overflow-hidden rounded-lg border border-border/50">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-border/50 bg-card/50">
                  <th className="px-4 py-2.5 font-semibold text-foreground">Data Category</th>
                  <th className="px-4 py-2.5 font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Account profile</td><td className="px-4 py-2.5">Permanently deleted</td></tr>
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Email, name, phone number</td><td className="px-4 py-2.5">Permanently deleted</td></tr>
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Profile photo</td><td className="px-4 py-2.5">Permanently deleted</td></tr>
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Purchase history</td><td className="px-4 py-2.5">Anonymised (financial records retained as required by law)</td></tr>
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Ticket data</td><td className="px-4 py-2.5">Permanently deleted (void active tickets)</td></tr>
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Event organiser data</td><td className="px-4 py-2.5">Events transferred or archived; personal data deleted</td></tr>
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">OAuth tokens (Google, Facebook)</td><td className="px-4 py-2.5">Revoked and deleted</td></tr>
                <tr><td className="px-4 py-2.5">Session and login data</td><td className="px-4 py-2.5">Permanently deleted</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section num="3" title="What Data May Be Retained">
          <p>
            Certain data may be retained for a limited period as required by law or for legitimate business purposes:
          </p>
          <ul className="mt-3 space-y-2">
            <Li><strong className="text-foreground">Financial transaction records:</strong> Retained for 7 years as required by tax and accounting regulations.</Li>
            <Li><strong className="text-foreground">Fraud prevention data:</strong> Limited data may be retained to prevent abuse and protect other users.</Li>
            <Li><strong className="text-foreground">Legal obligation data:</strong> Data required to comply with legal proceedings, government requests, or regulatory obligations.</Li>
            <Li><strong className="text-foreground">Anonymised analytics:</strong> Aggregated, non-identifiable data used for platform improvement may be retained indefinitely.</Li>
          </ul>
          <p className="mt-3">
            All retained data is anonymised where possible and stored securely. Once the retention period ends,
            the data is permanently deleted.
          </p>
        </Section>

        <Section num="4" title="Processing Timeline">
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-coral">24h</p>
              <p className="mt-1 text-base text-muted-foreground">Acknowledgement</p>
              <p className="mt-0.5 text-sm text-muted-foreground/60">We confirm receipt of your request</p>
            </div>
            <div className="rounded-lg border border-border/50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-coral">30 days</p>
              <p className="mt-1 text-base text-muted-foreground">Grace period</p>
              <p className="mt-0.5 text-sm text-muted-foreground/60">You can cancel the request during this time</p>
            </div>
            <div className="rounded-lg border border-border/50 p-4 text-center">
              <p className="font-display text-2xl font-bold text-coral">30 days</p>
              <p className="mt-1 text-base text-muted-foreground">Permanent deletion</p>
              <p className="mt-0.5 text-sm text-muted-foreground/60">All data permanently removed from our systems</p>
            </div>
          </div>
          <p className="mt-3">
            After the 30-day grace period, deletion is <strong className="text-foreground">irreversible</strong>.
            Your account, tickets, and all associated data will be permanently removed and cannot be recovered.
          </p>
        </Section>

        <Section num="5" title="What Happens to Active Tickets">
          <p>If you have active (unused) tickets at the time of deletion:</p>
          <ul className="mt-3 space-y-2">
            <Li>All active tickets will be <strong className="text-foreground">voided</strong> and cannot be used for entry.</Li>
            <Li>If the event has not yet occurred, you may request a <strong className="text-foreground">refund</strong> before submitting the deletion request.</Li>
            <Li>Transferred tickets that have been accepted by another user are not affected.</Li>
          </ul>
          <p className="mt-3">
            We strongly recommend using or transferring your tickets, and requesting any applicable refunds,
            before submitting a data deletion request.
          </p>
        </Section>

        <Section num="6" title="Organiser Account Deletion">
          <p>If you are an event organiser with active or upcoming events:</p>
          <ul className="mt-3 space-y-2">
            <Li>All <strong className="text-foreground">upcoming events</strong> must be either completed, cancelled, or transferred to another organiser before account deletion.</Li>
            <Li><strong className="text-foreground">Past event data</strong> (attendance records, financial settlements) will be anonymised but retained for tax compliance.</Li>
            <Li>Any <strong className="text-foreground">pending payouts</strong> will be processed before your account is deleted.</Li>
          </ul>
        </Section>

        <Section num="7" title="Your Rights Under Applicable Laws">
          <p>
            This data deletion process is designed to comply with applicable data protection regulations including:
          </p>
          <ul className="mt-3 space-y-2">
            <Li><strong className="text-foreground">PDPA (Malaysia)</strong> — Personal Data Protection Act 2010</Li>
            <Li><strong className="text-foreground">PDPA (Singapore)</strong> — Personal Data Protection Act 2012</Li>
            <Li><strong className="text-foreground">GDPR (EU/EEA)</strong> — General Data Protection Regulation, Article 17 (Right to Erasure)</Li>
            <Li><strong className="text-foreground">CCPA (California)</strong> — California Consumer Privacy Act</Li>
          </ul>
          <p className="mt-3">
            If you believe your data deletion request has not been handled appropriately, you have the right to
            lodge a complaint with your local data protection authority.
          </p>
        </Section>

        <Section num="8" title="Contact Us">
          <p>For questions about data deletion or to submit a request:</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <a
              href="mailto:privacy@riffoff.live?subject=Data%20Deletion%20Request"
              className="border border-border/50 px-4 py-2.5 text-base font-medium transition-all hover:border-coral/30 hover:text-coral"
            >
              privacy@riffoff.live
            </a>
            <a
              href="mailto:support@riffoff.live"
              className="border border-border/50 px-4 py-2.5 text-base font-medium transition-all hover:border-coral/30 hover:text-coral"
            >
              support@riffoff.live
            </a>
          </div>
          <p className="mt-4 text-base text-muted-foreground/60">
            See also our{" "}
            <Link href="/privacy" className="font-medium text-coral hover:underline">Privacy Policy</Link>{" "}
            and{" "}
            <Link href="/terms" className="font-medium text-coral hover:underline">Terms of Service</Link>.
          </p>
        </Section>
      </div>
    </LegalPageLayout>
  );
}
