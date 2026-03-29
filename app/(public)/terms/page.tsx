import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/features/shared/LegalPageLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions | RiffOff",
  description: "Terms governing your use of the RiffOff ticketing platform.",
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

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      subtitle="Rules of the Platform"
      lastUpdated="27 March 2026"
      icon="terms"
    >
      <div className="space-y-10">
        {/* Intro */}
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 text-base leading-relaxed text-muted-foreground">
          <p>
            Welcome to RiffOff. These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of
            the RiffOff platform, including our website, mobile applications, and all related services. Please read
            these Terms carefully before using our Platform.
          </p>
          <p className="mt-3">
            By creating an account or using RiffOff, you agree to be bound by these Terms.
          </p>
        </div>

        <Section num="1" title="Definitions">
          <div className="overflow-hidden rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <tbody className="text-muted-foreground">
                {[
                  { term: "RiffOff", def: "The RiffOff platform and its operators." },
                  { term: "User", def: "Any individual who accesses or uses the Platform." },
                  { term: "Attendee", def: "A User who purchases tickets through the Platform." },
                  { term: "Organiser", def: "A User who creates and manages events on the Platform." },
                  { term: "Event", def: "Any live music event, concert, festival, or performance listed on the Platform." },
                  { term: "Ticket", def: "A digital entry pass purchased through the Platform, delivered as a unique QR code." },
                ].map((item, i) => (
                  <tr key={item.term} className={i < 5 ? "border-b border-border/30" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-foreground">&ldquo;{item.term}&rdquo;</td>
                    <td className="px-4 py-2.5">{item.def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section num="2" title="Account Registration">
          <SubSection title="2.1 Eligibility">
            <p>
              You must be at least 13 years old to create an account. If you are between 13 and 18,
              you must have parental or guardian consent. By registering, you represent that you meet these requirements.
            </p>
          </SubSection>
          <SubSection title="2.2 Account Security">
            <ul className="space-y-2">
              <Li>You are responsible for maintaining the confidentiality of your credentials.</Li>
              <Li>You must notify us immediately of any unauthorised access to your account.</Li>
              <Li>You are responsible for all activities that occur under your account.</Li>
              <Li>We reserve the right to suspend or terminate accounts that violate these Terms.</Li>
            </ul>
          </SubSection>
          <SubSection title="2.3 Account Types">
            <p>
              RiffOff offers <strong className="text-foreground">Attendee</strong> accounts for purchasing tickets and
              attending events, and <strong className="text-foreground">Organiser</strong> accounts for creating and managing
              events. Organiser accounts require approval and are subject to additional terms in Section 8.
            </p>
          </SubSection>
        </Section>

        <Section num="3" title="Ticket Purchases">
          <SubSection title="3.1 Pricing and Fees">
            <ul className="space-y-2">
              <Li>All ticket prices are set by the Event Organiser and displayed in the applicable currency.</Li>
              <Li>RiffOff charges <strong className="text-foreground">zero platform fees</strong> to attendees — the price you see is the price you pay.</Li>
              <Li>Payment processing fees may apply and are handled by our payment providers (Stripe, PayPal, TNG Digital).</Li>
              <Li>Prices are subject to change until the moment of purchase completion.</Li>
            </ul>
          </SubSection>
          <SubSection title="3.2 Purchase Process">
            <ul className="space-y-2">
              <Li>Completing a purchase constitutes a binding agreement to pay the stated price.</Li>
              <Li>Tickets are delivered digitally as unique QR codes to your registered email and are accessible in your RiffOff account.</Li>
              <Li>Each ticket contains a unique, cryptographically secure QR code valid for one-time entry.</Li>
              <Li>Purchase confirmation is sent via email immediately after successful payment.</Li>
            </ul>
          </SubSection>
          <SubSection title="3.3 Ticket Limits">
            <p>
              Organisers may set per-person ticket limits. Attempts to circumvent these limits (including using
              multiple accounts) may result in order cancellation and account suspension.
            </p>
          </SubSection>
        </Section>

        <Section num="4" title="Refunds and Cancellations">
          <SubSection title="4.1 Event Cancellations">
            <p>
              If an Event is cancelled by the Organiser, attendees are entitled to a full refund. Refunds will be
              processed to the original payment method within 14 business days.
            </p>
          </SubSection>
          <SubSection title="4.2 Event Postponements">
            <p>
              If an Event is postponed, your ticket remains valid for the rescheduled date. If you cannot attend the
              new date, you may request a refund within 14 days of the postponement announcement.
            </p>
          </SubSection>
          <SubSection title="4.3 Attendee-Initiated Refunds">
            <ul className="space-y-2">
              <Li>Refund eligibility depends on the Organiser&apos;s refund policy displayed on the Event page at purchase time.</Li>
              <Li>Refund requests must be submitted at least 48 hours before Event start time unless otherwise specified.</Li>
              <Li>Refund processing takes 5–14 business days depending on the payment method.</Li>
            </ul>
          </SubSection>
          <SubSection title="4.4 Non-Refundable Situations">
            <p>Refunds are generally not provided for:</p>
            <ul className="mt-2 space-y-2">
              <Li>Failure to attend the Event (no-shows).</Li>
              <Li>Partial attendance or early departure.</Li>
              <Li>Dissatisfaction with the Event content or performance.</Li>
              <Li>Changes to the Event lineup or schedule (unless the headliner is removed).</Li>
            </ul>
          </SubSection>
        </Section>

        <Section num="5" title="Anti-Scalping Policy">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-sm font-bold text-destructive">Strictly Prohibited</p>
            <ul className="mt-3 space-y-2">
              <Li>Reselling tickets at a price above the original face value.</Li>
              <Li>Using automated tools, bots, or scripts to purchase tickets in bulk.</Li>
              <Li>Purchasing tickets with the intent to resell for profit.</Li>
              <Li>Transferring tickets to third-party resale platforms.</Li>
            </ul>
          </div>
          <p className="mt-3">
            Violations may result in ticket cancellation without refund, permanent account ban, and reporting to relevant
            authorities. Our fraud detection system monitors for suspicious purchasing patterns.
          </p>
        </Section>

        <Section num="6" title="Ticket Authenticity and QR Codes">
          <ul className="space-y-2">
            <Li>Each ticket is secured with a unique, single-use QR code that can only be scanned once at the event gate.</Li>
            <Li>Screenshots or copies of QR codes may not grant entry — the first valid scan is the authoritative entry.</Li>
            <Li>Do not share your QR code publicly. RiffOff is not responsible for unauthorised use of shared QR codes.</Li>
            <Li>Organisers use RiffOff&apos;s gate scanning system to verify ticket authenticity in real time.</Li>
          </ul>
        </Section>

        <Section num="7" title="Acceptable Use">
          <p>You agree not to:</p>
          <ul className="mt-3 space-y-2">
            <Li>Use the Platform for any unlawful purpose or in violation of any applicable laws.</Li>
            <Li>Impersonate any person or entity, or misrepresent your affiliation.</Li>
            <Li>Interfere with or disrupt the Platform&apos;s infrastructure or security features.</Li>
            <Li>Scrape, harvest, or collect data from the Platform without authorisation.</Li>
            <Li>Upload malicious content, viruses, or harmful code.</Li>
            <Li>Create multiple accounts to circumvent restrictions, bans, or ticket limits.</Li>
          </ul>
        </Section>

        <Section num="8" title="Organiser Terms">
          <SubSection title="8.1 Event Listing">
            <ul className="space-y-2">
              <Li>Organisers are responsible for the accuracy of all event information, including dates, venue, pricing, and descriptions.</Li>
              <Li>Events must comply with all applicable local laws and regulations.</Li>
              <Li>RiffOff reserves the right to remove events that violate these Terms or applicable law.</Li>
            </ul>
          </SubSection>
          <SubSection title="8.2 Payouts">
            <ul className="space-y-2">
              <Li>Organiser payouts are processed after the Event date, subject to a holding period of up to 7 business days.</Li>
              <Li>Payouts are made via the payment method configured in the Organiser&apos;s account settings.</Li>
              <Li>RiffOff may withhold payouts if there are outstanding disputes, chargebacks, or suspected fraud.</Li>
            </ul>
          </SubSection>
          <SubSection title="8.3 Organiser Responsibilities">
            <ul className="space-y-2">
              <Li>Organisers must honour all tickets purchased through RiffOff.</Li>
              <Li>Organisers are responsible for event-day logistics, safety, and compliance.</Li>
              <Li>In the event of cancellation, Organisers must notify RiffOff and all attendees promptly.</Li>
            </ul>
          </SubSection>
        </Section>

        <Section num="9" title="Intellectual Property">
          <ul className="space-y-2">
            <Li>The RiffOff name, logo, and all associated branding are trademarks of RiffOff.</Li>
            <Li>Content you upload remains your property. By uploading, you grant RiffOff a non-exclusive, worldwide, royalty-free licence to display and distribute this content on the Platform.</Li>
            <Li>You must not upload content that infringes on the intellectual property rights of others.</Li>
          </ul>
        </Section>

        <Section num="10" title="Limitation of Liability">
          <div className="rounded-lg border border-border/50 bg-card/30 p-4 text-sm">
            <ul className="space-y-2">
              <Li>RiffOff acts as a marketplace connecting Organisers and Attendees. We are not the organiser, promoter, or performer of any Event.</Li>
              <Li>We are not liable for the quality, safety, legality, or any aspect of Events listed on the Platform.</Li>
              <Li>Our total liability shall not exceed the amount you paid to RiffOff in the 12 months preceding the claim.</Li>
              <Li>We are not liable for indirect, incidental, special, consequential, or punitive damages.</Li>
            </ul>
          </div>
        </Section>

        <Section num="11" title="Indemnification">
          <p>
            You agree to indemnify and hold harmless RiffOff, its officers, directors, employees, and agents from any
            claims, liabilities, damages, losses, or expenses arising from your use of the Platform, violation of these
            Terms, or infringement of any third-party rights.
          </p>
        </Section>

        <Section num="12" title="Dispute Resolution">
          <ul className="space-y-2">
            <Li>Disputes between Attendees and Organisers should first be resolved directly between the parties.</Li>
            <Li>If direct resolution fails, contact <a href="mailto:support@riffoff.live" className="font-medium text-coral hover:underline">support@riffoff.live</a> for mediation assistance.</Li>
            <Li>Legal disputes shall be governed by the laws of Malaysia, and you agree to submit to the exclusive jurisdiction of the courts of Malaysia.</Li>
          </ul>
        </Section>

        <Section num="13" title="Modifications to Terms">
          <p>
            We may revise these Terms at any time. Material changes will be communicated via email or in-app notification
            at least 30 days before they take effect. Your continued use of the Platform constitutes acceptance of the
            revised Terms.
          </p>
        </Section>

        <Section num="14" title="Termination">
          <ul className="space-y-2">
            <Li>You may terminate your account at any time through Settings &gt; Danger Zone.</Li>
            <Li>We may suspend or terminate your account if you violate these Terms or engage in fraudulent activity.</Li>
            <Li>Upon termination, your right to use the Platform ceases immediately. Valid tickets purchased before termination remain honoured.</Li>
          </ul>
        </Section>

        <Section num="15" title="Severability">
          <p>
            If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall
            continue in full force and effect.
          </p>
        </Section>

        <Section num="16" title="Contact Us">
          <p>If you have questions about these Terms:</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <a href="mailto:legal@riffoff.live" className="border border-border/50 px-4 py-2.5 text-sm font-medium transition-all hover:border-coral/30 hover:text-coral">
              legal@riffoff.live
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
