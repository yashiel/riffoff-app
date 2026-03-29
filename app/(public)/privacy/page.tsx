import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/features/shared/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | RiffOff",
  description: "How RiffOff collects, uses, and protects your personal information.",
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

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="Your Data, Your Rights"
      lastUpdated="27 March 2026"
      icon="privacy"
    >
      <div className="space-y-10">
        {/* Intro */}
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 text-base leading-relaxed text-muted-foreground">
          <p>
            RiffOff (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the RiffOff platform — a music event
            ticketing service. This Privacy Policy explains how we collect, use, disclose, and safeguard
            your personal information when you use our services.
          </p>
          <p className="mt-3">
            By accessing or using RiffOff, you agree to the practices described in this policy.
          </p>
        </div>

        <Section num="1" title="Information We Collect">
          <SubSection title="1.1 Information You Provide">
            <ul className="space-y-2">
              <Li><strong className="text-foreground">Account information:</strong> name, email address, phone number, and password when you create an account.</Li>
              <Li><strong className="text-foreground">Profile information:</strong> display name, profile photo, organisation details, social media links, and timezone preferences.</Li>
              <Li><strong className="text-foreground">Transaction information:</strong> billing details, payment method (processed by Stripe, PayPal, or TNG Digital — we never store full card numbers), purchase history, and ticket details.</Li>
              <Li><strong className="text-foreground">Event information:</strong> when you create events as an organiser, including event details, descriptions, venue information, pricing, and cover images.</Li>
              <Li><strong className="text-foreground">Communications:</strong> messages you send through our support channels or in-app contact features.</Li>
            </ul>
          </SubSection>
          <SubSection title="1.2 Information Collected Automatically">
            <ul className="space-y-2">
              <Li><strong className="text-foreground">Device information:</strong> browser type, operating system, device identifiers, and screen resolution.</Li>
              <Li><strong className="text-foreground">Usage data:</strong> pages visited, features used, actions taken, time spent, and navigation patterns.</Li>
              <Li><strong className="text-foreground">Location data:</strong> approximate geographic location derived from IP address, used for currency conversion and event recommendations.</Li>
              <Li><strong className="text-foreground">Cookies and similar technologies:</strong> session cookies for authentication, preference cookies for display settings, and analytics cookies.</Li>
            </ul>
          </SubSection>
          <SubSection title="1.3 Information from Third Parties">
            <ul className="space-y-2">
              <Li>Payment providers (Stripe, PayPal, TNG Digital) may share transaction confirmation details.</Li>
              <Li>If you sign in via third-party authentication (OAuth), we receive your name and email from the identity provider.</Li>
            </ul>
          </SubSection>
        </Section>

        <Section num="2" title="How We Use Your Information">
          <ul className="space-y-2">
            <Li>Provide, maintain, and improve the RiffOff platform and its features.</Li>
            <Li>Process ticket purchases, refunds, and payouts to event organisers.</Li>
            <Li>Generate and deliver digital tickets with unique QR codes.</Li>
            <Li>Send transactional emails (order confirmations, ticket delivery, event updates).</Li>
            <Li>Personalise your experience (event recommendations, currency display, language).</Li>
            <Li>Detect, prevent, and address fraud, abuse, and security incidents.</Li>
            <Li>Verify ticket authenticity at event gates via our QR scanning system.</Li>
            <Li>Comply with legal obligations and respond to lawful requests.</Li>
            <Li>Analyse usage patterns to improve our platform (aggregated and anonymised).</Li>
          </ul>
        </Section>

        <Section num="3" title="How We Share Your Information">
          <p>We do not sell your personal information. We may share information with:</p>
          <ul className="mt-3 space-y-2">
            <Li><strong className="text-foreground">Event organisers:</strong> when you purchase tickets, the organiser receives your name and email to manage attendance and communicate event updates.</Li>
            <Li><strong className="text-foreground">Payment processors:</strong> Stripe, PayPal, and TNG Digital process payments on our behalf under their own privacy policies.</Li>
            <Li><strong className="text-foreground">Service providers:</strong> hosting (Vercel), backend services (Appwrite), email delivery, and analytics providers who assist in operating our platform.</Li>
            <Li><strong className="text-foreground">Legal requirements:</strong> when required by law, regulation, legal process, or governmental request.</Li>
            <Li><strong className="text-foreground">Business transfers:</strong> in connection with a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</Li>
          </ul>
        </Section>

        <Section num="4" title="Data Security">
          <p>We implement industry-standard security measures to protect your information:</p>
          <ul className="mt-3 space-y-2">
            <Li>All data is transmitted over TLS/HTTPS encryption.</Li>
            <Li>Passwords are hashed using Argon2id (never stored in plain text).</Li>
            <Li>Session tokens use httpOnly, Secure, and SameSite cookies.</Li>
            <Li>Payment data is handled by PCI-compliant processors — we never store card numbers.</Li>
            <Li>Database access uses row-level security (RLS) policies.</Li>
            <Li>Regular security audits and vulnerability assessments are conducted.</Li>
            <Li>Sensitive data at rest is encrypted using AES-128-GCM.</Li>
          </ul>
          <p className="mt-3 text-sm italic text-muted-foreground/60">
            While we strive to protect your information, no method of transmission over the internet is 100% secure.
          </p>
        </Section>

        <Section num="5" title="Data Retention">
          <div className="overflow-hidden rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-card/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">Data Type</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">Retention Period</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Account data</td><td className="px-4 py-2.5">Active + 30 days after deletion</td></tr>
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Transaction records</td><td className="px-4 py-2.5">7 years (financial compliance)</td></tr>
                <tr className="border-b border-border/30"><td className="px-4 py-2.5">Usage analytics</td><td className="px-4 py-2.5">24 months (individual), indefinite (aggregated)</td></tr>
                <tr><td className="px-4 py-2.5">Support communications</td><td className="px-4 py-2.5">3 years after last interaction</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section num="6" title="Cookies and Tracking">
          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Essential cookies</p>
              <p className="mt-1 text-sm">Required for authentication, security, and basic platform functionality. Cannot be disabled.</p>
            </div>
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Preference cookies</p>
              <p className="mt-1 text-sm">Remember your settings such as display currency, language, and theme (dark/light mode).</p>
            </div>
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Analytics cookies</p>
              <p className="mt-1 text-sm">Help us understand how visitors interact with our platform. Data is aggregated and does not personally identify you.</p>
            </div>
          </div>
          <p className="mt-3">You can manage cookie preferences through your browser settings.</p>
        </Section>

        <Section num="7" title="Your Rights">
          <p>Depending on your jurisdiction, you may have the following rights:</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { right: "Access", desc: "Request a copy of the personal data we hold about you." },
              { right: "Correction", desc: "Request correction of inaccurate or incomplete data." },
              { right: "Deletion", desc: "Request deletion of your account and associated data." },
              { right: "Portability", desc: "Receive your data in a structured, machine-readable format." },
              { right: "Objection", desc: "Object to processing of your data for certain purposes." },
              { right: "Withdrawal", desc: "Withdraw previously given consent at any time." },
            ].map((item) => (
              <div key={item.right} className="rounded-lg border border-border/50 p-3">
                <p className="text-sm font-semibold text-coral">{item.right}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-3">
            To exercise these rights, visit Settings &gt; Privacy, or contact{" "}
            <a href="mailto:privacy@riffoff.live" className="font-medium text-coral hover:underline">privacy@riffoff.live</a>.
          </p>
        </Section>

        <Section num="8" title="International Data Transfers">
          <p>
            RiffOff operates across Southeast Asia and internationally. Your data may be transferred to and processed in
            countries other than your country of residence. We ensure appropriate safeguards are in place in compliance with
            applicable data protection laws (including PDPA Malaysia, PDPA Singapore, GDPR where applicable).
          </p>
        </Section>

        <Section num="9" title="Children's Privacy">
          <p>
            RiffOff is not intended for use by individuals under the age of 13. We do not knowingly collect personal
            information from children under 13. If we become aware that a child under 13 has provided us with personal data,
            we will take steps to delete such information.
          </p>
        </Section>

        <Section num="10" title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the
            updated policy with a revised date. For significant changes, we will also notify you via email or in-app notification.
          </p>
        </Section>

        <Section num="11" title="Contact Us">
          <p>If you have questions or concerns about this Privacy Policy:</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <a href="mailto:privacy@riffoff.live" className="border border-border/50 px-4 py-2.5 text-sm font-medium transition-all hover:border-coral/30 hover:text-coral">
              privacy@riffoff.live
            </a>
            <a href="mailto:support@riffoff.live" className="border border-border/50 px-4 py-2.5 text-sm font-medium transition-all hover:border-coral/30 hover:text-coral">
              support@riffoff.live
            </a>
          </div>
        </Section>
      </div>
    </LegalPageLayout>
  );
}
