import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const BODY_SIZE = 11;
const LINE_HEIGHT = 16;

function wrapText(
  text: string,
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function generateEngagementPdf(params: {
  editionName: string;
  ambassadorName: string;
  region: string;
  engagementText: string;
  signatureName: string;
  acceptedAt: Date;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  const newPageIfNeeded = () => {
    if (y < MARGIN + LINE_HEIGHT * 4) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLine = (text: string, options: { bold?: boolean; size?: number } = {}) => {
    newPageIfNeeded();
    page.drawText(text, {
      x: MARGIN,
      y,
      size: options.size ?? BODY_SIZE,
      font: options.bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= (options.size ?? BODY_SIZE) + 6;
  };

  drawLine("Fiche d'engagement — Ambassadeur JNJL", { bold: true, size: 16 });
  y -= 6;
  drawLine(`Édition : ${params.editionName}`);
  drawLine(`Ambassadeur : ${params.ambassadorName} (${params.region})`);
  y -= 10;

  for (const line of wrapText(params.engagementText, font, BODY_SIZE, maxWidth)) {
    newPageIfNeeded();
    if (line === "") {
      y -= LINE_HEIGHT / 2;
      continue;
    }
    page.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font, color: rgb(0.15, 0.15, 0.15) });
    y -= LINE_HEIGHT;
  }

  y -= 20;
  newPageIfNeeded();
  drawLine("Acceptation", { bold: true, size: 13 });
  drawLine(`Je soussigné(e), ${params.signatureName}, déclare avoir lu et accepté les termes ci-dessus.`);
  drawLine(
    `Signé électroniquement le ${params.acceptedAt.toLocaleDateString("fr-FR")} à ${params.acceptedAt.toLocaleTimeString("fr-FR")}.`
  );

  return doc.save();
}
