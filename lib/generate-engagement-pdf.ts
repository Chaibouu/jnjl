import { readFile } from "fs/promises";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { renderActiveTemplate } from "@/lib/pdf-templates/render";
import { getAppUrl } from "@/lib/app-url";

/** Logo JNJL : lu sur le disque, ou récupéré depuis le site si le fichier n'est pas accessible. */
async function loadLogo(): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await readFile(join(process.cwd(), "public", "jnjl.jpg")));
  } catch {
    try {
      const response = await fetch(`${getAppUrl()}/jnjl.jpg`);
      if (response.ok) return new Uint8Array(await response.arrayBuffer());
    } catch {
      // Sans logo, la fiche est quand même générée.
    }
  }
  return null;
}

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
  /** Si fourni, le modèle PDF actif de cette édition (éditeur admin) est utilisé en priorité. */
  editionId?: string;
  editionName: string;
  ambassadorName: string;
  region: string;
  engagementText: string;
  signatureName: string;
  acceptedAt: Date;
}): Promise<Uint8Array> {
  const custom = await renderActiveTemplate("ENGAGEMENT", params.editionId, {
    editionName: params.editionName,
    ambassadorName: params.ambassadorName,
    region: params.region,
    engagementText: params.engagementText,
    signatureName: params.signatureName,
    acceptedAt: params.acceptedAt.toLocaleDateString("fr-FR"),
  });
  if (custom) return custom;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await loadLogo();
  const logoImage = logoBytes ? await doc.embedJpg(logoBytes).catch(() => null) : null;

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  // En-tête : logo JNJL centré, reprenant la mise en page du document officiel.
  if (logoImage) {
    const logoSize = 70;
    page.drawImage(logoImage, {
      x: (PAGE_WIDTH - logoSize) / 2,
      y: y - logoSize,
      width: logoSize,
      height: logoSize,
    });
    y -= logoSize + 16;
  }

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

  const drawCenteredLine = (text: string, options: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
    newPageIfNeeded();
    const size = options.size ?? BODY_SIZE;
    const usedFont = options.bold ? boldFont : font;
    const width = usedFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (PAGE_WIDTH - width) / 2,
      y,
      size,
      font: usedFont,
      color: options.color ?? rgb(0.1, 0.1, 0.1),
    });
    y -= size + 6;
  };

  // Le titre de la déclaration est déjà la première ligne du texte d'engagement :
  // pas de titre dupliqué ici, seuls l'édition et l'identité de l'ambassadeur sont rappelés.
  drawCenteredLine(params.editionName, { color: rgb(0.941, 0.451, 0.129) });
  drawCenteredLine(`Ambassadeur : ${params.ambassadorName} (${params.region})`);
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
