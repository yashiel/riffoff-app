import * as QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts, PDFPage } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Ticket PDF Generator — Premium Design
// ---------------------------------------------------------------------------
// Generates a beautifully designed PDF ticket with:
// - RiffOff logo (embedded PNG)
// - Dark brand theme with lime accents
// - Large QR code for check-in
// - Event details with clean typography
// - Decorative elements (corner marks, dividers, patterns)
// ---------------------------------------------------------------------------

export interface TicketPDFData {
  eventTitle: string;
  eventDate: string;
  venue: string;
  tierName: string;
  ticketCode: string;
  quantity: number;
  totalAmount: string;
  currency: string;
  qrCodeData?: string;
}

// Brand colors in RGB (0-1 range)
const C = {
  bg: rgb(8 / 255, 8 / 255, 10 / 255),
  card: rgb(15 / 255, 15 / 255, 18 / 255),
  subCard: rgb(22 / 255, 22 / 255, 26 / 255),
  lime: rgb(191 / 255, 255 / 255, 0 / 255),
  limeDim: rgb(191 / 255, 255 / 255, 0 / 255),
  pink: rgb(255 / 255, 45 / 255, 120 / 255),
  white: rgb(244 / 255, 244 / 255, 246 / 255),
  muted: rgb(139 / 255, 139 / 255, 154 / 255),
  dim: rgb(90 / 255, 90 / 255, 102 / 255),
  border: rgb(40 / 255, 40 / 255, 48 / 255),
  darkBorder: rgb(30 / 255, 30 / 255, 36 / 255),
};

/**
 * Generate a premium PDF ticket.
 * Returns the PDF as a Buffer.
 */
export async function generateTicketPDF(data: TicketPDFData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const courier = await doc.embedFont(StandardFonts.CourierBold);

  // Embed the logo PNG
  let logoPng: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const logoPath = path.resolve(process.cwd(), "public/logo-email.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      logoPng = await doc.embedPng(logoBytes);
    } else {
      // Try the other logo path
      const altPath = path.resolve("D:/dev/riffoff/email-logo.png");
      if (fs.existsSync(altPath)) {
        const logoBytes = fs.readFileSync(altPath);
        logoPng = await doc.embedPng(logoBytes);
      }
    }
  } catch {
    // Logo embed failed — continue without
  }

  // Ticket dimensions — portrait card format (396 x 720 pts)
  const W = 396;
  const H = 720;
  const page = doc.addPage([W, H]);
  const m = 28; // margin
  const iW = W - m * 2; // inner width

  // ── Full Background ─────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });

  // ── Main Card ───────────────────────────────────────────────────────
  const cardY = 20;
  const cardH = H - 40;
  const cardR = 16;
  page.drawRectangle({
    x: 16, y: cardY, width: W - 32, height: cardH,
    color: C.card,
    borderColor: C.border,
    borderWidth: 0.5,
  });

  // ── Lime accent bar at top ──────────────────────────────────────────
  page.drawRectangle({
    x: 16, y: H - 20 - 4, width: W - 32, height: 4,
    color: C.lime,
  });

  // ── Corner marks (decorative) ───────────────────────────────────────
  const cornerLen = 20;
  const cornerW = 1.5;
  const cx = 28;
  const cy = 32;
  // Top-left
  drawCornerMark(page, cx, H - 36, cornerLen, cornerW, C.lime, "tl");
  // Top-right
  drawCornerMark(page, W - cx, H - 36, cornerLen, cornerW, C.lime, "tr");
  // Bottom-left
  drawCornerMark(page, cx, cy, cornerLen, cornerW, C.dim, "bl");
  // Bottom-right
  drawCornerMark(page, W - cx, cy, cornerLen, cornerW, C.dim, "br");

  let y = H - 56;

  // ── Logo ────────────────────────────────────────────────────────────
  if (logoPng) {
    const logoW = 140;
    const logoH = (logoPng.height / logoPng.width) * logoW;
    page.drawImage(logoPng, {
      x: (W - logoW) / 2,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    y -= logoH + 8;
  } else {
    // Fallback text logo
    const logoText = "RIFFOFF";
    const logoSize = 26;
    const logoW = helveticaBold.widthOfTextAtSize(logoText, logoSize);
    page.drawText(logoText, {
      x: (W - logoW) / 2, y: y - logoSize,
      size: logoSize, font: helveticaBold, color: C.lime,
    });
    y -= logoSize + 8;
  }

  // "E-TICKET" badge
  const badgeText = "E-TICKET";
  const badgeSize = 9;
  const badgeW = helveticaBold.widthOfTextAtSize(badgeText, badgeSize);
  const badgePadX = 12;
  const badgePadY = 5;
  const badgeTotalW = badgeW + badgePadX * 2;
  const badgeX = (W - badgeTotalW) / 2;
  page.drawRectangle({
    x: badgeX, y: y - badgeSize - badgePadY * 2,
    width: badgeTotalW, height: badgeSize + badgePadY * 2,
    color: C.subCard, borderColor: C.border, borderWidth: 0.5,
  });
  page.drawText(badgeText, {
    x: badgeX + badgePadX,
    y: y - badgeSize - badgePadY + 1,
    size: badgeSize, font: helveticaBold, color: C.muted,
  });
  y -= badgeSize + badgePadY * 2 + 24;

  // ── Event Title ─────────────────────────────────────────────────────
  const titleSize = 22;
  const titleLines = wrapText(data.eventTitle.toUpperCase(), helveticaBold, titleSize, iW - 16);
  for (const line of titleLines) {
    const tw = helveticaBold.widthOfTextAtSize(line, titleSize);
    page.drawText(line, {
      x: (W - tw) / 2, y,
      size: titleSize, font: helveticaBold, color: C.white,
    });
    y -= titleSize + 8;
  }
  y -= 8;

  // ── Thin divider ────────────────────────────────────────────────────
  page.drawLine({
    start: { x: m + 20, y }, end: { x: W - m - 20, y },
    thickness: 0.5, color: C.border,
  });
  y -= 20;

  // ── Detail Rows ─────────────────────────────────────────────────────
  const details: [string, string, boolean?][] = [
    ["DATE", data.eventDate],
    ["VENUE", data.venue],
    ["TIER", data.tierName],
    ["QTY", String(data.quantity)],
    ["TOTAL", `${data.currency} ${data.totalAmount}`, true],
  ];

  for (const [label, value, isHighlight] of details) {
    // Label
    page.drawText(label, {
      x: m + 12, y,
      size: 9, font: helveticaBold, color: C.dim,
    });

    // Value — truncate if too long
    const valSize = 12;
    const displayVal = value.length > 35 ? value.slice(0, 33) + "…" : value;
    const valW = helveticaBold.widthOfTextAtSize(displayVal, valSize);
    page.drawText(displayVal, {
      x: W - m - 12 - valW, y,
      size: valSize, font: helveticaBold, color: isHighlight ? C.lime : C.white,
    });

    y -= 22;
  }

  // ── Dashed tear-off line ────────────────────────────────────────────
  y -= 8;
  let dx = m + 8;
  while (dx < W - m - 8) {
    const endX = Math.min(dx + 8, W - m - 8);
    page.drawLine({
      start: { x: dx, y }, end: { x: endX, y },
      thickness: 1, color: C.lime, opacity: 0.3,
    });
    dx += 14;
  }

  // Small circles at tear-off edges (perforation effect)
  page.drawCircle({ x: 16, y, size: 8, color: C.bg });
  page.drawCircle({ x: W - 16, y, size: 8, color: C.bg });
  y -= 20;

  // ── QR Code ─────────────────────────────────────────────────────────
  if (data.qrCodeData) {
    try {
      const qrPng = await QRCode.toBuffer(data.qrCodeData, {
        width: 500,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        type: "png" as "png",
      });
      const qrImage = await doc.embedPng(qrPng);
      const qrSize = 160;

      // White background for QR
      page.drawRectangle({
        x: (W - qrSize - 16) / 2,
        y: y - qrSize - 16,
        width: qrSize + 16,
        height: qrSize + 16,
        color: rgb(1, 1, 1),
        borderColor: C.border,
        borderWidth: 0.5,
      });

      page.drawImage(qrImage, {
        x: (W - qrSize) / 2,
        y: y - qrSize - 8,
        width: qrSize,
        height: qrSize,
      });
      y -= qrSize + 28;
    } catch {
      // QR failed — continue
    }
  }

  // ── Ticket Code ─────────────────────────────────────────────────────
  const codeLabelText = "TICKET CODE";
  const codeLabelSize = 9;
  const codeLabelW = helveticaBold.widthOfTextAtSize(codeLabelText, codeLabelSize);
  page.drawText(codeLabelText, {
    x: (W - codeLabelW) / 2, y,
    size: codeLabelSize, font: helveticaBold, color: C.dim,
  });
  y -= 20;

  const codeSize = 30;
  const codeW = courier.widthOfTextAtSize(data.ticketCode, codeSize);
  page.drawText(data.ticketCode, {
    x: (W - codeW) / 2, y,
    size: codeSize, font: courier, color: C.lime,
  });
  y -= 28;

  // ── Instruction Box ─────────────────────────────────────────────────
  const instrH = 36;
  page.drawRectangle({
    x: m + 4, y: y - instrH,
    width: iW - 8, height: instrH,
    color: C.subCard,
  });
  const instrText = "Show this ticket at the venue entrance";
  const instrSize = 10;
  const instrW = helvetica.widthOfTextAtSize(instrText, instrSize);
  page.drawText(instrText, {
    x: (W - instrW) / 2, y: y - instrH / 2 - instrSize / 3,
    size: instrSize, font: helvetica, color: C.muted,
  });

  // ── Footer ──────────────────────────────────────────────────────────
  const footerText = "© 2026 RiffOff — Anti-scalping. Anti-fraud. Pro-music.";
  const footerSize = 8;
  const footerW = helvetica.widthOfTextAtSize(footerText, footerSize);
  page.drawText(footerText, {
    x: (W - footerW) / 2, y: 32,
    size: footerSize, font: helvetica, color: C.dim,
  });

  // ── Generate PDF ────────────────────────────────────────────────────
  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ── Decorative corner marks ───────────────────────────────────────────
function drawCornerMark(
  page: PDFPage,
  x: number, y: number,
  len: number, w: number,
  color: ReturnType<typeof rgb>,
  corner: "tl" | "tr" | "bl" | "br",
) {
  const dirs: Record<string, [number, number, number, number]> = {
    tl: [1, 0, 0, -1],
    tr: [-1, 0, 0, -1],
    bl: [1, 0, 0, 1],
    br: [-1, 0, 0, 1],
  };
  const [hx, , , vy] = dirs[corner];
  // Horizontal line
  page.drawLine({
    start: { x, y }, end: { x: x + len * hx, y },
    thickness: w, color, opacity: 0.6,
  });
  // Vertical line
  page.drawLine({
    start: { x, y }, end: { x, y: y + len * vy },
    thickness: w, color, opacity: 0.6,
  });
}

// ── Text wrapping helper ──────────────────────────────────────────────
function wrapText(
  text: string,
  font: { widthOfTextAtSize(text: string, size: number): number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
