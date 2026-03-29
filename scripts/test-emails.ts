/**
 * Test all 7 email templates with images, QR codes, and rich data.
 * Usage: npx tsx scripts/test-emails.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✅ SET" : "❌ MISSING");

const TO = "yashilanka@gmail.com";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendTicketConfirmationEmail,
    sendApplicationStatusEmail,
    sendEventPublishedEmail,
    sendEventCancelledEmail,
  } = await import("../lib/email");

  console.log(`\n📧 Sending all 7 email templates to ${TO}\n`);

  // 1. Verification OTP
  console.log("1/7 — Verification OTP...");
  const r1 = await sendVerificationEmail(TO, "847291", "Yashi");
  console.log(`     ${r1.success ? "✅" : "❌"}`);
  await delay(1500);

  // 2. Password Reset
  console.log("2/7 — Password Reset...");
  const r2 = await sendPasswordResetEmail(TO, "503816", "Yashi");
  console.log(`     ${r2.success ? "✅" : "❌"}`);
  await delay(1500);

  // 3. Welcome Newsletter (with trending events + images)
  console.log("3/7 — Welcome Newsletter (with event images)...");
  const r3 = await sendWelcomeEmail(TO, {
    userName: "Yashi",
    trendingEvents: [
      {
        title: "ONE OK ROCK DETOX Asia Tour",
        date: "29 Apr 2026",
        venue: "Axiata Arena, KL",
        imageUrl: "https://www.allkpop.com/upload/2022/09/content/250120/1664083209-yettocome-collage.jpg",
        eventUrl: "https://riffoff.live/events/oneokrock-detox",
      },
      {
        title: "Glastonbury 2026",
        date: "24 Jun 2026",
        venue: "Somerset, UK",
        imageUrl: "https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2021/09/yohani-1632936586.jpg",
        eventUrl: "https://riffoff.live/events/glastonbury-2026",
      },
      {
        title: "Summer Sonic Festival",
        date: "15 Aug 2026",
        venue: "Tokyo, Japan",
        imageUrl: "https://consequence.net/wp-content/uploads/2025/09/My-Chemical-Romance.jpg?quality=80&w=1031&h=580&crop=1",
        eventUrl: "https://riffoff.live/events/summersonic-2026",
      },
    ],
  });
  console.log(`     ${r3.success ? "✅" : "❌"}`);
  await delay(1500);

  // 4. Ticket Confirmation (with cover image + QR code)
  console.log("4/7 — Ticket Confirmation (with QR code)...");
  const r4 = await sendTicketConfirmationEmail(TO, {
    userName: "Yashi",
    eventTitle: "ONE OK ROCK DETOX Asia Tour 2026",
    eventDate: "Wednesday, 29 April 2026 at 7:00 PM",
    venue: "Axiata Arena, Kuala Lumpur",
    tierName: "Standing Zone A",
    ticketCode: "RO-7X9K2M",
    quantity: 2,
    totalAmount: "590.00",
    currency: "USD",
    coverImageUrl: "https://www.allkpop.com/upload/2022/09/content/250120/1664083209-yettocome-collage.jpg",
    qrCodeData: "riffoff:ticket:RO-7X9K2M:evt-oneokrock:sig-abc123def456",
  });
  console.log(`     ${r4.success ? "✅" : "❌"}`);
  await delay(1500);

  // 5. Application Accepted
  console.log("5/7 — Application Status...");
  const r5 = await sendApplicationStatusEmail(TO, {
    userName: "Yashi",
    eventTitle: "RiffOff Live at Merdekarya",
    status: "accepted",
    message: "We loved your demo! You're confirmed for the 9 PM slot. Arrive by 7 PM for soundcheck.",
  });
  console.log(`     ${r5.success ? "✅" : "❌"}`);
  await delay(1500);

  // 6. Event Published (with cover image + video)
  console.log("6/7 — Event Published (with image + video)...");
  const r6 = await sendEventPublishedEmail(TO, {
    userName: "Yashi",
    eventTitle: "Sunset Beats Festival 2026",
    eventDate: "Saturday, 12 July 2026 at 4:00 PM",
    venue: "Sentosa Beach, Singapore",
    eventUrl: "https://riffoff.live/events/sunset-beats-2026",
    coverImageUrl: "https://consequence.net/wp-content/uploads/2025/09/My-Chemical-Romance.jpg?quality=80&w=1031&h=580&crop=1",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  console.log(`     ${r6.success ? "✅" : "❌"}`);
  await delay(1500);

  // 7. Event Cancelled (with cover image)
  console.log("7/7 — Event Cancelled (with image)...");
  const r7 = await sendEventCancelledEmail(TO, {
    userName: "Yashi",
    eventTitle: "Midnight Jazz Sessions",
    refundInfo: "Full refund of USD 120.00 initiated. Please allow 5-10 business days.",
    coverImageUrl: "https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2021/09/yohani-1632936586.jpg",
  });
  console.log(`     ${r7.success ? "✅" : "❌"}`);

  console.log(`\n🎉 All 7 emails sent! Check ${TO}\n`);
}

main().catch(console.error);
