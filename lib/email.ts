"use server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "RiffOff <noreply@riffoff.com>";

/**
 * Send a 6-digit OTP verification email.
 * Uses Resend API if configured, otherwise logs to console (dev mode).
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  userName?: string,
): Promise<{ success: boolean; error?: string }> {
  const html = buildOTPEmailHTML(code, userName);

  if (RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: `${code} is your RiffOff verification code`,
          html,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[EMAIL] Resend error:", data);
        return { success: false, error: "Failed to send verification email" };
      }

      return { success: true };
    } catch (err) {
      console.error("[EMAIL] Resend fetch error:", err);
      return { success: false, error: "Failed to send verification email" };
    }
  }

  // Dev fallback — log to console
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║   VERIFICATION CODE (dev mode)         ║");
  console.log(`║   Email: ${email.padEnd(29)}║`);
  console.log(`║   Code:  ${code}                          ║`);
  console.log("╚════════════════════════════════════════╝\n");

  return { success: true };
}

/** Build branded HTML email template */
function buildOTPEmailHTML(code: string, userName?: string): string {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";
  const digits = code.split("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#08080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:900;letter-spacing:0.02em;">
        <span style="color:#FF2D78;">RIFF</span><span style="color:#ffffff;">OFF</span>
      </span>
    </div>

    <!-- Card -->
    <div style="background:#0f0f12;border-radius:16px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">
      <p style="color:#f4f4f6;font-size:16px;margin:0 0 8px;">${greeting}</p>
      <p style="color:#6b6b7a;font-size:14px;margin:0 0 24px;line-height:1.5;">
        Enter this code to verify your email and complete your RiffOff registration.
      </p>

      <!-- OTP Code -->
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;">
          ${digits
            .map(
              (d) =>
                `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-size:28px;font-weight:700;color:#BFFF00;background:#16161a;border-radius:10px;margin:0 3px;border:1px solid rgba(191,255,0,0.2);">${d}</span>`,
            )
            .join("")}
        </div>
      </div>

      <p style="color:#6b6b7a;font-size:13px;margin:24px 0 0;text-align:center;">
        This code expires in <strong style="color:#f4f4f6;">10 minutes</strong>.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#3a3a44;font-size:12px;margin:0;">
        If you didn't create a RiffOff account, ignore this email.
      </p>
      <p style="color:#3a3a44;font-size:11px;margin:8px 0 0;">
        © 2026 RiffOff · Music Events & Tickets
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}
