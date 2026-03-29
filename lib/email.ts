"use server";

import * as QRCode from "qrcode";
import { generateTicketPDF } from "../lib/tickets/pdf";

// ---------------------------------------------------------------------------
// RiffOff Email Service
// ---------------------------------------------------------------------------
// Production-grade email templates for RiffOff music ticketing platform.
// Uses Resend API in production, silently succeeds in dev mode.
//
// Brand: #08080a body, #0f0f12 card, #16161a sub-card, #BFFF00 lime accent,
// #FF2D78 pink accent, #f4f4f6 primary text, #8b8b9a muted text.
// ---------------------------------------------------------------------------

// Read env vars lazily (getters) so they resolve at call-time, not import-time.
// This avoids the ES-module hoisting issue where module-level consts capture
// undefined because dotenv hasn't run yet.
function getApiKey() { return process.env.RESEND_API_KEY; }
function getFromEmail() { return process.env.FROM_EMAIL || "RiffOff <noreply@riffoff.live>"; }
function getAppUrl() { return process.env.NEXT_PUBLIC_APP_URL || "https://riffoff.live"; }
function getLogoUrl() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://yashilanka.com/v1";
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT || "riffoff-dev";
  return `${endpoint}/storage/buckets/event-media/files/riffoff-email-logo/view?project=${project}`;
}

// ── Logo Data URI ─────────────────────────────────────────────────────────
// RiffOff SVG logo with brand colors: #f4f4f6 (RIFF text) + #BFFF00 (OFF symbol)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LOGO_PNG_BASE64 =
  "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";

// ── Types ───────────────────────────────────────────────────────────────────

interface EmailResult {
  success: boolean;
  error?: string;
}

interface TicketConfirmationData {
  userName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  tierName: string;
  ticketCode: string;
  quantity: number;
  totalAmount: string;
  currency: string;
  coverImageUrl?: string;
  qrCodeData?: string;
}

interface ApplicationStatusData {
  userName: string;
  eventTitle: string;
  status: "accepted" | "rejected" | "shortlisted";
  message?: string;
}

interface EventPublishedData {
  userName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  eventUrl: string;
  coverImageUrl?: string;
  videoUrl?: string;
}

interface EventCancelledData {
  userName: string;
  eventTitle: string;
  refundInfo?: string;
  coverImageUrl?: string;
}

interface WelcomeEmailData {
  userName: string;
  trendingEvents?: Array<{
    title: string;
    date: string;
    venue: string;
    imageUrl?: string;
    eventUrl: string;
  }>;
}

// ── Brand Tokens ────────────────────────────────────────────────────────────

const BRAND = {
  bodyBg: "#08080a",
  cardBg: "#0f0f12",
  subCardBg: "#16161a",
  lime: "#BFFF00",
  pink: "#FF2D78",
  textPrimary: "#f4f4f6",
  textMuted: "#8b8b9a",
  textDim: "#5a5a66",
  footerText: "#3a3a44",
  border: "rgba(255,255,255,0.06)",
  borderSubtle: "rgba(255,255,255,0.04)",
  success: "#22c55e",
  warning: "#facc15",
  error: "#ef4444",
  limeSubtle: "rgba(191,255,0,0.15)",
  limeBorder: "rgba(191,255,0,0.25)",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
  mono: "'Courier New',Courier,monospace",
} as const;

// ── Core Sender ─────────────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: string; content_id?: string }>,
): Promise<EmailResult> {
  if (getApiKey()) {
    try {
      const payload: Record<string, unknown> = {
        from: getFromEmail(),
        to: [to],
        subject,
        html,
      };
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return { success: false, error: "Failed to send email" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "Failed to send email" };
    }
  }

  // Dev fallback — handled per-function for richer output
  return { success: true };
}


// ═══════════════════════════════════════════════════════════════════════════
// Transactional Senders (public API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a 6-digit OTP verification email.
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  userName?: string,
): Promise<EmailResult> {
  const subject = `${code} is your RiffOff verification code`;
  const html = buildOTPTemplate(code, userName, "verify");

  if (!getApiKey()) {
    return { success: true };
  }

  return sendEmail(email, subject, html);
}

/**
 * Send a password-reset OTP email.
 */
export async function sendPasswordResetEmail(
  email: string,
  code: string,
  userName?: string,
): Promise<EmailResult> {
  const subject = `${code} -- Reset your RiffOff password`;
  const html = buildOTPTemplate(code, userName, "reset");

  if (!getApiKey()) {
    return { success: true };
  }

  return sendEmail(email, subject, html);
}

/**
 * Send a welcome email after registration.
 */
export async function sendWelcomeEmail(
  email: string,
  data: WelcomeEmailData | string,
): Promise<EmailResult> {
  const resolved: WelcomeEmailData =
    typeof data === "string" ? { userName: data } : data;
  const subject = "Welcome to RiffOff!";
  const html = buildWelcomeTemplate(resolved);

  if (!getApiKey()) {
    return { success: true };
  }

  return sendEmail(email, subject, html);
}

/**
 * Send ticket confirmation after successful purchase.
 * Uses CID inline image for QR code (Gmail-compatible) + HTML ticket attachment.
 */
export async function sendTicketConfirmationEmail(
  email: string,
  data: TicketConfirmationData,
): Promise<EmailResult> {
  const subject = `Your tickets for ${data.eventTitle}`;

  // Build inline images and file attachments
  const allAttachments: Array<{ filename: string; content: string; content_id?: string }> = [];
  let inlineQrContentId: string | undefined;

  // Generate QR code as Buffer for CID inline image (Gmail-compatible)
  if (data.qrCodeData) {
    try {
      const qrBuffer = await QRCode.toBuffer(data.qrCodeData, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      const qrBase64 = qrBuffer.toString("base64");
      inlineQrContentId = "qrcode";
      allAttachments.push({
        filename: "qrcode.png",
        content: qrBase64,
        content_id: inlineQrContentId,
      });
    } catch {
      // QR generation failed — ticket code is still shown
    }
  }

  // Generate PDF ticket attachment
  try {
    const pdfBuffer = await generateTicketPDF({
      eventTitle: data.eventTitle,
      eventDate: data.eventDate,
      venue: data.venue,
      tierName: data.tierName,
      ticketCode: data.ticketCode,
      quantity: data.quantity,
      totalAmount: data.totalAmount,
      currency: data.currency,
      qrCodeData: data.qrCodeData,
    });
    allAttachments.push({
      filename: `RiffOff-Ticket-${data.ticketCode}.pdf`,
      content: pdfBuffer.toString("base64"),
    });
  } catch {
    // PDF generation failed — email still sends without attachment
  }

  const html = await buildTicketConfirmationTemplate(data, inlineQrContentId);

  if (!getApiKey()) {
    return { success: true };
  }

  return sendEmail(email, subject, html, allAttachments.length > 0 ? allAttachments : undefined);
}

/**
 * Send application-status update (accepted / rejected / shortlisted).
 */
export async function sendApplicationStatusEmail(
  email: string,
  data: ApplicationStatusData,
): Promise<EmailResult> {
  const subjectMap: Record<ApplicationStatusData["status"], string> = {
    accepted: `Good news! You're accepted for ${data.eventTitle}`,
    shortlisted: `You've been shortlisted for ${data.eventTitle}`,
    rejected: `Application update for ${data.eventTitle}`,
  };
  const subject = subjectMap[data.status];
  const html = buildApplicationStatusTemplate(data);

  if (!getApiKey()) {
    return { success: true };
  }

  return sendEmail(email, subject, html);
}

/**
 * Notify a user that a new event has been published.
 */
export async function sendEventPublishedEmail(
  email: string,
  data: EventPublishedData,
): Promise<EmailResult> {
  const subject = `${data.eventTitle} is now live!`;
  const html = buildEventPublishedTemplate(data);

  if (!getApiKey()) {
    return { success: true };
  }

  return sendEmail(email, subject, html);
}

/**
 * Notify a user that an event has been cancelled.
 */
export async function sendEventCancelledEmail(
  email: string,
  data: EventCancelledData,
): Promise<EmailResult> {
  const subject = `Event cancelled: ${data.eventTitle}`;
  const html = buildEventCancelledTemplate(data);

  if (!getApiKey()) {
    return { success: true };
  }

  return sendEmail(email, subject, html);
}

// ═══════════════════════════════════════════════════════════════════════════
// Composable Template Helpers (private)
// ═══════════════════════════════════════════════════════════════════════════

function doctype(): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`;
}

function headBlock(): string {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>RiffOff</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    @media (prefers-color-scheme: dark) {
      body, .body-bg { background-color: ${BRAND.bodyBg} !important; }
    }
    @media only screen and (max-width: 620px) {
      .wrapper { width: 100% !important; }
      .mobile-padding { padding: 28px 18px !important; }
      .mobile-full { width: 100% !important; display: block !important; }
      .mobile-hide { display: none !important; }
      .mobile-center { text-align: center !important; }
    }
  </style>
</head>`;
}

function bodyOpen(): string {
  return `<body class="body-bg" style="margin:0;padding:0;background-color:${BRAND.bodyBg};font-family:${BRAND.font};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">`;
}

function preheader(text: string): string {
  return `  <div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${text}${"&#847; &zwnj; &nbsp;".repeat(20)}</div>`;
}

function outerTableOpen(): string {
  return `  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.bodyBg};">
    <tr>
      <td align="center" style="padding:0;">
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td><![endif]-->
        <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;margin:0 auto;">`;
}

function outerTableClose(): string {
  return `        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>`;
}

function spacer(height: number): string {
  return `          <tr><td style="height:${height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

function logo(): string {
  return `          <tr>
            <td align="center" style="padding:48px 24px 0;">
              <a href="${getAppUrl()}" style="text-decoration:none;">
                <img src="${getLogoUrl()}" width="200" height="36" alt="RiffOff" style="display:block;border:0;outline:none;width:200px;height:auto;" />
              </a>
            </td>
          </tr>`;
}

function cardOpen(): string {
  return `          <tr>
            <td class="mobile-padding" style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cardBg};border-radius:16px;border:1px solid ${BRAND.border};">
                <tr>
                  <td style="padding:40px 32px;">`;
}

function cardClose(): string {
  return `                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function greeting(name?: string): string {
  const who = name ? `Hi ${name},` : "Hi there,";
  return `<p style="color:${BRAND.textPrimary};font-size:22px;font-weight:700;margin:0 0 10px;line-height:1.3;">${who}</p>`;
}

function bodyText(text: string, marginBottom = 24): string {
  return `<p style="color:${BRAND.textMuted};font-size:16px;margin:0 0 ${marginBottom}px;line-height:1.65;">${text}</p>`;
}

function smallMutedText(text: string, center = false): string {
  const align = center ? "text-align:center;" : "";
  return `<p style="color:${BRAND.textDim};font-size:15px;margin:24px 0 0;line-height:1.5;${align}">${text}</p>`;
}

function ctaButton(label: string, href: string, secondary = false): string {
  const bg = secondary ? "transparent" : BRAND.lime;
  const color = secondary ? BRAND.textPrimary : BRAND.bodyBg;
  const border = secondary ? `2px solid ${BRAND.border}` : "none";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px auto 4px;">
  <tr>
    <td align="center" style="border-radius:12px;background-color:${bg};border:${border};">
      <a href="${href}" target="_blank" style="display:inline-block;color:${color};font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.02em;mso-padding-alt:0;text-transform:none;">
        <!--[if mso]><i style="mso-font-width:300%;mso-text-raise:21pt">&nbsp;</i><![endif]-->
        <span style="mso-text-raise:12pt;">${label}</span>
        <!--[if mso]><i style="mso-font-width:300%">&nbsp;</i><![endif]-->
      </a>
    </td>
  </tr>
</table>`;
}

function dualCtaButtons(
  primary: { label: string; href: string },
  secondary: { label: string; href: string },
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:32px 0 4px;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-radius:12px;background-color:${BRAND.lime};">
            <a href="${primary.href}" target="_blank" style="display:inline-block;color:${BRAND.bodyBg};font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;letter-spacing:0.02em;">${primary.label}</a>
          </td>
          <td style="width:14px;">&nbsp;</td>
          <td style="border-radius:12px;border:2px solid ${BRAND.border};">
            <a href="${secondary.href}" target="_blank" style="display:inline-block;color:${BRAND.textPrimary};font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;letter-spacing:0.02em;">${secondary.label}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function divider(margin = 28): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:${margin}px 0;"><tr><td style="height:1px;background-color:${BRAND.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

function detailTable(rows: Array<[string, string]>): string {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr>
  <td style="color:${BRAND.textMuted};font-size:16px;padding:12px 0;border-bottom:1px solid ${BRAND.border};">${label}</td>
  <td style="color:${BRAND.textPrimary};font-size:16px;font-weight:600;padding:12px 0;text-align:right;border-bottom:1px solid ${BRAND.border};">${value}</td>
</tr>`,
    )
    .join("\n");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
${rowsHtml}
</table>`;
}

function subCard(content: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.subCardBg};border-radius:12px;border:1px solid ${BRAND.borderSubtle};margin-bottom:24px;">
  <tr>
    <td style="padding:24px;">
${content}
    </td>
  </tr>
</table>`;
}

function socialFooter(): string {
  return `          <tr>
            <td align="center" style="padding:36px 24px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 12px;">
                    <a href="https://instagram.com/riffoff" target="_blank" style="color:${BRAND.textDim};font-size:15px;text-decoration:none;font-weight:600;">Instagram</a>
                  </td>
                  <td style="color:${BRAND.footerText};font-size:15px;">&#183;</td>
                  <td style="padding:0 12px;">
                    <a href="https://x.com/riffoff" target="_blank" style="color:${BRAND.textDim};font-size:15px;text-decoration:none;font-weight:600;">X</a>
                  </td>
                  <td style="color:${BRAND.footerText};font-size:15px;">&#183;</td>
                  <td style="padding:0 12px;">
                    <a href="https://tiktok.com/@riffoff" target="_blank" style="color:${BRAND.textDim};font-size:15px;text-decoration:none;font-weight:600;">TikTok</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function legalFooter(note?: string): string {
  const noteHtml = note
    ? `<p style="color:${BRAND.footerText};font-size:14px;margin:0 0 14px;line-height:1.6;">${note}</p>`
    : "";
  return `          <tr>
            <td align="center" style="padding:24px 24px 48px;">
              ${noteHtml}
              <p style="color:${BRAND.footerText};font-size:13px;margin:0 0 10px;line-height:1.5;">
                &copy; 2026 RiffOff &middot; Music Events &amp; Tickets
              </p>
              <p style="color:${BRAND.footerText};font-size:13px;margin:0 0 10px;line-height:1.5;">
                123 Music Lane, Kuala Lumpur, Malaysia
              </p>
              <p style="color:${BRAND.footerText};font-size:13px;margin:0;line-height:1.5;">
                <a href="${getAppUrl()}/unsubscribe" style="color:${BRAND.textDim};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${getAppUrl()}/privacy" style="color:${BRAND.textDim};text-decoration:underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>`;
}

// ── OTP Digits (table-based for Outlook) ─────────────────────────────────

function otpDigits(code: string): string {
  const cells = code
    .split("")
    .map(
      (d) =>
        `<td style="width:56px;height:72px;text-align:center;font-size:36px;font-weight:700;color:${BRAND.lime};background-color:${BRAND.subCardBg};border-radius:10px;border:2px solid ${BRAND.limeBorder};font-family:${BRAND.mono};letter-spacing:0;">${d}</td>`,
    )
    .join(`\n<td style="width:8px;">&nbsp;</td>\n`);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">
  <tr>
    ${cells}
  </tr>
</table>`;
}

// ── Status Badge ────────────────────────────────────────────────────────────

function statusBadge(
  status: "accepted" | "rejected" | "shortlisted",
): string {
  const config: Record<
    typeof status,
    { bg: string; border: string; color: string; label: string }
  > = {
    accepted: {
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.3)",
      color: BRAND.success,
      label: "Accepted",
    },
    shortlisted: {
      bg: "rgba(250,204,21,0.12)",
      border: "rgba(250,204,21,0.3)",
      color: BRAND.warning,
      label: "Shortlisted",
    },
    rejected: {
      bg: "rgba(139,139,154,0.08)",
      border: "rgba(139,139,154,0.15)",
      color: BRAND.textMuted,
      label: "Not Selected",
    },
  };
  const c = config[status];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
  <tr>
    <td style="background-color:${c.bg};border:1px solid ${c.border};border-radius:100px;padding:8px 24px;">
      <span style="color:${c.color};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${c.label}</span>
    </td>
  </tr>
</table>`;
}

// ── Assemble Full Email ──────────────────────────────────────────────────────

function assembleEmail(
  preheaderText: string,
  contentRows: string,
  footerNote?: string,
): string {
  return [
    doctype(),
    headBlock(),
    bodyOpen(),
    preheader(preheaderText),
    outerTableOpen(),
    logo(),
    spacer(28),
    contentRows,
    socialFooter(),
    legalFooter(footerNote),
    outerTableClose(),
    "</body>",
    "</html>",
  ].join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// Template Builders
// ═══════════════════════════════════════════════════════════════════════════

// ── 1. OTP (Verification + Password Reset) ──────────────────────────────────

function buildOTPTemplate(
  code: string,
  userName: string | undefined,
  mode: "verify" | "reset",
): string {
  const isVerify = mode === "verify";
  const preheaderCopy = isVerify
    ? `${code} is your verification code. It expires in 10 minutes.`
    : `${code} is your password reset code. It expires in 10 minutes.`;

  const headline = isVerify ? "Verify your email" : "Reset your password";
  const copy = isVerify
    ? "Enter this code to verify your email and complete your RiffOff registration."
    : "Enter this code to reset your password. If you didn't request this, you can safely ignore this email.";
  const footerNote = isVerify
    ? "If you didn't create a RiffOff account, please ignore this email."
    : "If you didn't request a password reset, please ignore this email.";

  const iconSvg = isVerify
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;"><tr><td style="width:56px;height:56px;background-color:${BRAND.limeSubtle};border-radius:14px;text-align:center;vertical-align:middle;font-size:28px;">&#9993;</td></tr></table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;"><tr><td style="width:56px;height:56px;background-color:rgba(250,204,21,0.12);border-radius:14px;text-align:center;vertical-align:middle;font-size:28px;">&#128274;</td></tr></table>`;

  const content = [
    cardOpen(),
    `<div style="text-align:center;">`,
    iconSvg,
    `<p style="color:${BRAND.textPrimary};font-size:24px;font-weight:700;margin:0 0 6px;text-align:center;">${headline}</p>`,
    `<p style="color:${BRAND.textMuted};font-size:16px;margin:0 0 6px;text-align:center;">${greeting(userName).replace(/<[^>]*>/g, "").trim()}</p>`,
    `</div>`,
    bodyText(copy, 6),
    otpDigits(code),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background-color:${BRAND.subCardBg};border-radius:8px;padding:12px 24px;"><p style="color:${BRAND.textMuted};font-size:15px;margin:0;text-align:center;">This code expires in <strong style="color:${BRAND.textPrimary};">10 minutes</strong></p></td></tr></table>`,
    divider(),
    smallMutedText(
      `If you didn't ${isVerify ? "create a RiffOff account" : "request this"}, you can safely ignore this email. Your account is secure.`,
      true,
    ),
    cardClose(),
  ].join("\n");

  return assembleEmail(preheaderCopy, content, footerNote);
}

// ── 2. Welcome (Newsletter-Style — Showstopper) ─────────────────────────────

function buildWelcomeTemplate(data: WelcomeEmailData): string {
  const userName = data.userName;
  const preheaderCopy = `Welcome to RiffOff, ${userName}! Discover live music, get tickets, and more.`;

  // Hero section — dark card with lime accent text (not full lime bg)
  const heroSection = `          <tr>
            <td class="mobile-padding" style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.subCardBg};border-radius:16px 16px 0 0;overflow:hidden;border:1px solid ${BRAND.border};border-bottom:none;">
                <tr>
                  <td style="padding:56px 40px;text-align:center;">
                    <p style="color:${BRAND.lime};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;margin:0 0 16px;">Welcome to</p>
                    <p style="color:${BRAND.textPrimary};font-size:42px;font-weight:900;margin:0 0 16px;line-height:1.1;letter-spacing:-0.02em;">THE SHOW</p>
                    <p style="color:${BRAND.textMuted};font-size:17px;font-weight:500;margin:0;line-height:1.5;">Your journey into live music starts here, ${userName}.</p>
                    <div style="width:60px;height:3px;background-color:${BRAND.lime};margin:20px auto 0;border-radius:2px;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  // Stats bar — 3 impressive numbers
  const statsBar = `          <tr>
            <td class="mobile-padding" style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cardBg};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
                <tr>
                  <td style="width:33.33%;padding:28px 16px;text-align:center;border-right:1px solid ${BRAND.border};">
                    <p style="color:${BRAND.lime};font-size:28px;font-weight:800;margin:0;line-height:1;">${"10,000+"}</p>
                    <p style="color:${BRAND.textMuted};font-size:13px;font-weight:600;margin:6px 0 0;text-transform:uppercase;letter-spacing:0.08em;">Events</p>
                  </td>
                  <td style="width:33.33%;padding:28px 16px;text-align:center;border-right:1px solid ${BRAND.border};">
                    <p style="color:${BRAND.lime};font-size:28px;font-weight:800;margin:0;line-height:1;">${"50+"}</p>
                    <p style="color:${BRAND.textMuted};font-size:13px;font-weight:600;margin:6px 0 0;text-transform:uppercase;letter-spacing:0.08em;">Cities</p>
                  </td>
                  <td style="width:33.33%;padding:28px 16px;text-align:center;">
                    <p style="color:${BRAND.lime};font-size:28px;font-weight:800;margin:0;line-height:1;">${"0%"}</p>
                    <p style="color:${BRAND.textMuted};font-size:13px;font-weight:600;margin:6px 0 0;text-transform:uppercase;letter-spacing:0.08em;">Hidden Fees</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  // Feature cards — larger icons, better spacing
  const featureCards = `          <tr>
            <td class="mobile-padding" style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cardBg};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};border-radius:0 0 16px 16px;">
                <tr>
                  <td style="padding:32px 28px;">
                    <p style="color:${BRAND.textPrimary};font-size:20px;font-weight:700;margin:0 0 24px;">Here's what you can do</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td class="mobile-full" style="width:33.33%;padding-right:10px;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.subCardBg};border-radius:14px;border:1px solid ${BRAND.borderSubtle};">
                            <tr><td style="padding:28px 18px;text-align:center;">
                              <p style="font-size:40px;margin:0 0 14px;">&#127925;</p>
                              <p style="color:${BRAND.textPrimary};font-size:16px;font-weight:700;margin:0 0 8px;">Discover</p>
                              <p style="color:${BRAND.textMuted};font-size:14px;margin:0;line-height:1.5;">Browse live music, festivals, and gigs near you.</p>
                            </td></tr>
                          </table>
                        </td>
                        <td class="mobile-full" style="width:33.33%;padding:0 5px;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.subCardBg};border-radius:14px;border:1px solid ${BRAND.borderSubtle};">
                            <tr><td style="padding:28px 18px;text-align:center;">
                              <p style="font-size:40px;margin:0 0 14px;">&#127903;</p>
                              <p style="color:${BRAND.textPrimary};font-size:16px;font-weight:700;margin:0 0 8px;">Tickets</p>
                              <p style="color:${BRAND.textMuted};font-size:14px;margin:0;line-height:1.5;">Secure your spot with instant QR tickets.</p>
                            </td></tr>
                          </table>
                        </td>
                        <td class="mobile-full" style="width:33.33%;padding-left:10px;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.subCardBg};border-radius:14px;border:1px solid ${BRAND.borderSubtle};">
                            <tr><td style="padding:28px 18px;text-align:center;">
                              <p style="font-size:40px;margin:0 0 14px;">&#127908;</p>
                              <p style="color:${BRAND.textPrimary};font-size:16px;font-weight:700;margin:0 0 8px;">Perform</p>
                              <p style="color:${BRAND.textMuted};font-size:14px;margin:0;line-height:1.5;">Apply to perform at upcoming events.</p>
                            </td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  // Trending events section — larger cards, full-width images
  const fallbackEvents: WelcomeEmailData["trendingEvents"] = [
    {
      title: "Summer Sonic Festival",
      date: "Aug 15, 2026",
      venue: "Tokyo, Japan",
      eventUrl: `${getAppUrl()}/events`,
    },
    {
      title: "Glastonbury 2026",
      date: "Jun 24, 2026",
      venue: "Somerset, UK",
      eventUrl: `${getAppUrl()}/events`,
    },
    {
      title: "Coachella Weekend 1",
      date: "Apr 10, 2026",
      venue: "Indio, California",
      eventUrl: `${getAppUrl()}/events`,
    },
  ];
  const trendingEvents =
    data.trendingEvents && data.trendingEvents.length > 0
      ? data.trendingEvents
      : fallbackEvents!;

  const eventCardHtml = trendingEvents
    .map((ev) => {
      const imageHtml = ev.imageUrl
        ? `<img src="${ev.imageUrl}" width="100%" height="180" alt="${ev.title}" style="display:block;width:100%;height:180px;object-fit:cover;border-radius:12px 12px 0 0;" />`
        : "";
      const topPadding = ev.imageUrl ? "16px 16px" : "24px 16px";
      return `                  <td class="mobile-full" style="width:33.33%;padding:0 5px;vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.subCardBg};border-radius:12px;border:1px solid ${BRAND.borderSubtle};overflow:hidden;">
                      ${imageHtml ? `<tr><td style="padding:0;font-size:0;line-height:0;">${imageHtml}</td></tr>` : ""}
                      <tr><td style="padding:${topPadding};">
                        <p style="color:${BRAND.textPrimary};font-size:15px;font-weight:700;margin:0 0 10px;line-height:1.3;">${ev.title}</p>
                        <p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 4px;">${ev.date}</p>
                        <p style="color:${BRAND.textDim};font-size:13px;margin:0 0 14px;">${ev.venue}</p>
                        <a href="${ev.eventUrl}" style="color:${BRAND.lime};font-size:14px;font-weight:700;text-decoration:none;">Get Tickets &#8594;</a>
                      </td></tr>
                    </table>
                  </td>`;
    })
    .join("\n");

  const trendingSection = `          <tr>
            <td class="mobile-padding" style="padding:28px 24px 0;">
              <p style="color:${BRAND.textPrimary};font-size:20px;font-weight:700;margin:0 0 20px;">Trending Events</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
${eventCardHtml}
                </tr>
              </table>
            </td>
          </tr>`;

  // Browse CTA
  const browseCta = `          <tr>
            <td align="center" style="padding:32px 24px 0;">
              ${ctaButton("Browse All Events", `${getAppUrl()}/events`)}
            </td>
          </tr>`;

  // Follow us footer section
  const followSection = `          <tr>
            <td class="mobile-padding" style="padding:28px 24px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cardBg};border-radius:14px;border:1px solid ${BRAND.border};">
                <tr>
                  <td style="padding:28px 32px;text-align:center;">
                    <p style="color:${BRAND.textPrimary};font-size:16px;font-weight:700;margin:0 0 8px;">Stay in the loop</p>
                    <p style="color:${BRAND.textMuted};font-size:15px;margin:0 0 20px;line-height:1.5;">Follow us for backstage content, giveaways, and artist announcements.</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding:0 10px;">
                          <a href="https://instagram.com/riffoff" style="color:${BRAND.lime};font-size:15px;font-weight:700;text-decoration:none;">Instagram</a>
                        </td>
                        <td style="color:${BRAND.textDim};font-size:15px;">&#183;</td>
                        <td style="padding:0 10px;">
                          <a href="https://x.com/riffoff" style="color:${BRAND.lime};font-size:15px;font-weight:700;text-decoration:none;">X / Twitter</a>
                        </td>
                        <td style="color:${BRAND.textDim};font-size:15px;">&#183;</td>
                        <td style="padding:0 10px;">
                          <a href="https://tiktok.com/@riffoff" style="color:${BRAND.lime};font-size:15px;font-weight:700;text-decoration:none;">TikTok</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  const content = [
    heroSection,
    statsBar,
    featureCards,
    trendingSection,
    browseCta,
    followSection,
  ].join("\n");

  return assembleEmail(preheaderCopy, content);
}

// ── 3. Ticket Confirmation ──────────────────────────────────────────────────

async function buildTicketConfirmationTemplate(
  data: TicketConfirmationData,
  inlineQrContentId?: string,
): Promise<string> {
  const preheaderCopy = `Your tickets for ${data.eventTitle} are confirmed! Ticket code: ${data.ticketCode}`;

  // Event detail sub-card content
  const eventDetailsInner = `<p style="color:${BRAND.lime};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px;">Event Details</p>
<p style="color:${BRAND.textPrimary};font-size:20px;font-weight:700;margin:0 0 16px;line-height:1.3;">${data.eventTitle}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td style="color:${BRAND.textMuted};font-size:15px;padding:5px 0;vertical-align:middle;">
      <span style="color:${BRAND.lime};margin-right:8px;">&#128197;</span>${data.eventDate}
    </td>
  </tr>
  <tr>
    <td style="color:${BRAND.textMuted};font-size:15px;padding:5px 0;vertical-align:middle;">
      <span style="color:${BRAND.lime};margin-right:8px;">&#128205;</span>${data.venue}
    </td>
  </tr>
</table>`;

  // Build sub-card with optional cover image (edge-to-edge within the sub-card)
  const eventSubCard = data.coverImageUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.subCardBg};border-radius:12px;border:1px solid ${BRAND.borderSubtle};margin-bottom:24px;overflow:hidden;">
  <tr>
    <td style="padding:0;font-size:0;line-height:0;">
      <img src="${data.coverImageUrl}" width="100%" height="200" alt="${data.eventTitle}" style="display:block;border-radius:12px 12px 0 0;object-fit:cover;width:100%;height:200px;" />
    </td>
  </tr>
  <tr>
    <td style="padding:24px;">
${eventDetailsInner}
    </td>
  </tr>
</table>`
    : subCard(eventDetailsInner);

  // QR code — use CID inline image (Gmail-compatible) or fallback to data URI
  let qrImageHtml = "";
  if (inlineQrContentId) {
    // CID approach — works in Gmail, Outlook, Apple Mail
    qrImageHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 0;">
  <tr>
    <td style="text-align:center;">
      <img src="cid:${inlineQrContentId}" width="220" height="220" alt="Ticket QR Code" style="display:block;margin:0 auto;border-radius:10px;width:220px;height:220px;" />
    </td>
  </tr>
</table>`;
  } else if (data.qrCodeData) {
    // Fallback for dev/preview — data URI (won't render in Gmail)
    try {
      const qrDataUrl = await QRCode.toDataURL(data.qrCodeData, {
        width: 220,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      qrImageHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 0;">
  <tr>
    <td style="text-align:center;">
      <img src="${qrDataUrl}" width="220" height="220" alt="Ticket QR Code" style="display:block;margin:0 auto;border-radius:10px;width:220px;height:220px;" />
    </td>
  </tr>
</table>`;
    } catch {
      // QR generation failed silently — ticket code is still shown
    }
  }

  // Ticket code block — large and prominent with dashed border "tear-off"
  const ticketCodeBlock = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0;">
  <tr>
    <td style="border:2px dashed ${BRAND.limeBorder};border-radius:14px;padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:24px;text-align:center;background-color:${BRAND.subCardBg};border-radius:12px;">
            <p style="color:${BRAND.textMuted};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px;">Your Ticket Code</p>
            <p style="color:${BRAND.lime};font-size:34px;font-weight:800;letter-spacing:0.2em;font-family:${BRAND.mono};margin:0 0 12px;">${data.ticketCode}</p>
${qrImageHtml}
            <p style="color:${BRAND.textDim};font-size:14px;margin:${qrImageHtml ? "14px" : "0"} 0 0;">Show ${qrImageHtml ? "this QR code" : "the QR code"} at the venue for fast check-in</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const content = [
    cardOpen(),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;"><tr><td style="width:56px;height:56px;background-color:${BRAND.limeSubtle};border-radius:14px;text-align:center;vertical-align:middle;font-size:28px;">&#127903;</td></tr></table>`,
    `<p style="color:${BRAND.textPrimary};font-size:24px;font-weight:700;margin:0 0 6px;text-align:center;">Tickets Confirmed!</p>`,
    `<p style="color:${BRAND.textMuted};font-size:16px;margin:0 0 28px;text-align:center;">Your booking details are below.</p>`,
    eventSubCard,
    detailTable([
      ["Tier", data.tierName],
      ["Quantity", String(data.quantity)],
      ["Total Paid", `${data.currency} ${data.totalAmount}`],
    ]),
    ticketCodeBlock,
    dualCtaButtons(
      { label: "View Tickets", href: `${getAppUrl()}/dashboard/tickets` },
      { label: "Add to Calendar", href: `${getAppUrl()}/dashboard/tickets` },
    ),
    cardClose(),
  ].join("\n");

  return assembleEmail(preheaderCopy, content);
}

// ── 4. Application Status ───────────────────────────────────────────────────

function buildApplicationStatusTemplate(data: ApplicationStatusData): string {
  const preheaderMap: Record<ApplicationStatusData["status"], string> = {
    accepted: `Great news! Your application to perform at ${data.eventTitle} has been accepted.`,
    shortlisted: `You've been shortlisted for ${data.eventTitle}. Final selections coming soon.`,
    rejected: `Application update for ${data.eventTitle}. Keep exploring upcoming events.`,
  };

  const copyMap: Record<ApplicationStatusData["status"], string> = {
    accepted: `Great news! Your application to perform at <strong style="color:${BRAND.textPrimary};">${data.eventTitle}</strong> has been accepted. The organiser is excited to have you on board.`,
    shortlisted: `You've been shortlisted for <strong style="color:${BRAND.textPrimary};">${data.eventTitle}</strong>. The organiser is reviewing final selections and will be in touch soon.`,
    rejected: `Thank you for applying to <strong style="color:${BRAND.textPrimary};">${data.eventTitle}</strong>. Unfortunately, the organiser wasn't able to include your act this time. Don't give up -- there are plenty of upcoming events to explore.`,
  };

  const iconMap: Record<ApplicationStatusData["status"], string> = {
    accepted: `&#9989;`,
    shortlisted: `&#9203;`,
    rejected: `&#128172;`,
  };

  const iconBgMap: Record<ApplicationStatusData["status"], string> = {
    accepted: "rgba(34,197,94,0.12)",
    shortlisted: "rgba(250,204,21,0.12)",
    rejected: "rgba(139,139,154,0.08)",
  };

  const messageBlock = data.message
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.subCardBg};border-radius:10px;border-left:3px solid ${BRAND.limeBorder};margin:20px 0 0;">
  <tr>
    <td style="padding:20px 24px;">
      <p style="color:${BRAND.textDim};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Message from Organiser</p>
      <p style="color:${BRAND.textPrimary};font-size:16px;margin:0;line-height:1.6;font-style:italic;">${data.message}</p>
    </td>
  </tr>
</table>`
    : "";

  const ctaLabel =
    data.status === "rejected" ? "Browse Other Events" : "View Application";
  const ctaHref =
    data.status === "rejected"
      ? `${getAppUrl()}/events`
      : `${getAppUrl()}/dashboard/applications`;

  const content = [
    cardOpen(),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;"><tr><td style="width:56px;height:56px;background-color:${iconBgMap[data.status]};border-radius:14px;text-align:center;vertical-align:middle;font-size:28px;">${iconMap[data.status]}</td></tr></table>`,
    `<div style="text-align:center;">`,
    statusBadge(data.status),
    `</div>`,
    greeting(data.userName),
    bodyText(copyMap[data.status]),
    messageBlock,
    ctaButton(ctaLabel, ctaHref),
    cardClose(),
  ].join("\n");

  return assembleEmail(preheaderMap[data.status], content);
}

// ── 5. Event Published ──────────────────────────────────────────────────────

function buildEventPublishedTemplate(data: EventPublishedData): string {
  const preheaderCopy = `${data.eventTitle} just went live on RiffOff! Get your tickets before they sell out.`;

  // "NEW EVENT" banner
  const banner = `          <tr>
            <td class="mobile-padding" style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg, rgba(191,255,0,0.08) 0%, rgba(191,255,0,0.02) 100%);border-radius:16px 16px 0 0;border:1px solid ${BRAND.limeBorder};border-bottom:none;">
                <tr>
                  <td style="padding:20px 32px;text-align:center;">
                    <p style="color:${BRAND.lime};font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.2em;margin:0;">&#9733; New Event &#9733;</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  // Cover image for the event (if provided)
  const publishedCoverHtml = data.coverImageUrl
    ? `<tr>
                  <td style="padding:0;font-size:0;line-height:0;">
                    <img src="${data.coverImageUrl}" width="100%" height="200" alt="${data.eventTitle}" style="display:block;width:100%;height:200px;object-fit:cover;" />
                  </td>
                </tr>`
    : "";

  const eventCardContent = `<p style="color:${BRAND.textPrimary};font-size:24px;font-weight:700;margin:0 0 20px;line-height:1.3;">${data.eventTitle}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td style="color:${BRAND.textMuted};font-size:16px;padding:8px 0;vertical-align:middle;">
      <span style="color:${BRAND.lime};margin-right:8px;">&#128197;</span>${data.eventDate}
    </td>
  </tr>
  <tr>
    <td style="color:${BRAND.textMuted};font-size:16px;padding:8px 0;vertical-align:middle;">
      <span style="color:${BRAND.lime};margin-right:8px;">&#128205;</span>${data.venue}
    </td>
  </tr>
</table>`;

  // Video button (styled as secondary CTA)
  const videoButtonHtml = data.videoUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0;">
  <tr>
    <td align="center" style="border-radius:12px;border:2px solid ${BRAND.border};">
      <a href="${data.videoUrl}" target="_blank" style="display:inline-block;color:${BRAND.textPrimary};font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:12px;letter-spacing:0.02em;">&#9654; Watch Video</a>
    </td>
  </tr>
</table>`
    : "";

  // Card with no top border-radius (connects to banner)
  const eventCard = `          <tr>
            <td class="mobile-padding" style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cardBg};border-radius:0 0 16px 16px;border:1px solid ${BRAND.border};border-top:none;">
${publishedCoverHtml}
                <tr>
                  <td style="padding:32px 32px 10px;">
                    ${greeting(data.userName)}
                    ${bodyText("A new event you might be interested in just went live on RiffOff!")}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px;">
                    ${subCard(eventCardContent)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px;text-align:center;">
                    ${ctaButton("Get Tickets Now", data.eventUrl)}
                    ${videoButtonHtml}
                    <p style="color:${BRAND.textDim};font-size:15px;margin:20px 0 0;text-align:center;">
                      Share with friends:
                      <a href="https://twitter.com/intent/tweet?text=Check+out+${encodeURIComponent(data.eventTitle)}+on+RiffOff!&url=${encodeURIComponent(data.eventUrl)}" style="color:${BRAND.lime};text-decoration:none;font-weight:600;margin-left:8px;">X</a>
                      &nbsp;&#183;&nbsp;
                      <a href="https://wa.me/?text=Check+out+${encodeURIComponent(data.eventTitle)}+on+RiffOff!+${encodeURIComponent(data.eventUrl)}" style="color:${BRAND.lime};text-decoration:none;font-weight:600;">WhatsApp</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  const content = [banner, eventCard].join("\n");

  return assembleEmail(preheaderCopy, content);
}

// ── 6. Event Cancelled ──────────────────────────────────────────────────────

function buildEventCancelledTemplate(data: EventCancelledData): string {
  const preheaderCopy = `${data.eventTitle} has been cancelled. ${data.refundInfo ? "Refund details inside." : "We're sorry for the inconvenience."}`;

  const refundBlock = data.refundInfo
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:rgba(250,204,21,0.06);border-radius:12px;border:1px solid rgba(250,204,21,0.15);margin:24px 0;">
  <tr>
    <td style="padding:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="vertical-align:top;width:36px;">
            <span style="font-size:24px;">&#9888;</span>
          </td>
          <td style="vertical-align:top;padding-left:10px;">
            <p style="color:${BRAND.warning};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Refund Information</p>
            <p style="color:${BRAND.textPrimary};font-size:16px;margin:0;line-height:1.6;">${data.refundInfo}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
    : "";

  // Small cover image for context (if provided)
  const cancelledCoverHtml = data.coverImageUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
  <tr>
    <td style="font-size:0;line-height:0;">
      <img src="${data.coverImageUrl}" width="200" height="100" alt="${data.eventTitle}" style="display:block;width:200px;height:100px;object-fit:cover;border-radius:10px;opacity:0.7;" />
    </td>
  </tr>
</table>`
    : "";

  const content = [
    cardOpen(),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;"><tr><td style="width:56px;height:56px;background-color:rgba(239,68,68,0.12);border-radius:14px;text-align:center;vertical-align:middle;font-size:28px;">&#128532;</td></tr></table>`,
    `<p style="color:${BRAND.textPrimary};font-size:24px;font-weight:700;margin:0 0 24px;text-align:center;">Event Cancelled</p>`,
    cancelledCoverHtml,
    greeting(data.userName),
    bodyText(
      `We're sorry to let you know that <strong style="color:${BRAND.textPrimary};">${data.eventTitle}</strong> has been cancelled by the organiser.`,
    ),
    refundBlock,
    bodyText(
      "We know this is disappointing. Check out other upcoming events that might catch your eye.",
    ),
    ctaButton("Browse Other Events", `${getAppUrl()}/events`),
    divider(),
    smallMutedText(
      "If you had tickets for this event, your refund will be processed according to the information above. Please allow 5-10 business days for the refund to appear.",
      true,
    ),
    cardClose(),
  ].join("\n");

  return assembleEmail(preheaderCopy, content);
}
