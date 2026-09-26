import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import QRCode from "qrcode";
import { renderActiveTemplate } from "@/lib/pdf-templates/render";

// A6 portrait, en points (105 × 148 mm) : format d'un badge de conférence.
const WIDTH = 297.64;
const HEIGHT = 419.53;
const ORANGE = rgb(0.941, 0.451, 0.129); // #F07321
const BLACK_FALLBACK = rgb(0, 0, 0); // #000000 — repli si l'édition n'a pas de couleur de fond
const MUTED = rgb(0.45, 0.45, 0.45);
const WHITE = rgb(1, 1, 1);

/** "#282828" → rgb(...). Retombe sur le noir par défaut si la valeur est absente ou invalide. */
function hexToRgb(hex: string | null | undefined) {
  const match = hex?.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return BLACK_FALLBACK;
  const value = match[1]!;
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
}

/** Remplace les caractères que la police standard ne sait pas écrire (évite une erreur de génération). */
function safe(text: string, font: PDFFont): string {
  try {
    font.encodeText(text);
    return text;
  } catch {
    return Array.from(text)
      .map(char => {
        try {
          font.encodeText(char);
          return char;
        } catch {
          return "?";
        }
      })
      .join("");
  }
}

/** Plus grande taille (entre min et max) pour laquelle le texte tient dans la largeur donnée. */
function fitSize(text: string, font: PDFFont, maxWidth: number, max: number, min: number) {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

export async function generateBadgePdf(params: {
  /** Si fourni, le modèle PDF actif de cette édition (éditeur admin) est utilisé en priorité. */
  editionId?: string;
  label: string;
  fullName: string;
  region: string;
  editionName: string;
  editionLocation?: string | null;
  eventDate?: string | null;
  /** Couleur de fond du badge (hex) — configurée par édition, repli sur le noir. */
  backgroundColor?: string | null;
  number: string;
  awardedAt: Date;
  /** Contenu du logo JNJL (JPEG) — le badge est généré sans logo s'il est absent. */
  logo?: Uint8Array | null;
  /** Logos partenaires (PNG) affichés dans le bandeau du haut, dans l'ordre. */
  partnerLogos?: (Uint8Array | null)[];
}): Promise<Uint8Array> {
  const custom = await renderActiveTemplate("BADGE", params.editionId, {
    label: params.label,
    fullName: params.fullName,
    region: params.region,
    editionName: params.editionName,
    number: params.number,
    awardedAt: params.awardedAt.toLocaleDateString("fr-FR"),
  });
  if (custom) return custom;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const page = doc.addPage([WIDTH, HEIGHT]);
  const bg = hexToRgb(params.backgroundColor);

  const centered = (text: string, y: number, size: number, usedFont: PDFFont, color = WHITE) => {
    const value = safe(text, usedFont);
    const width = usedFont.widthOfTextAtSize(value, size);
    page.drawText(value, { x: (WIDTH - width) / 2, y, size, font: usedFont, color });
  };

  // ─── Bandeau blanc du haut : logos partenaires ─────────────────────────────
  const topBandHeight = 54;
  page.drawRectangle({ x: 0, y: HEIGHT - topBandHeight, width: WIDTH, height: topBandHeight, color: WHITE });

  const logos = (params.partnerLogos ?? []).filter((buffer): buffer is Uint8Array => !!buffer);
  if (logos.length > 0) {
    const embedded: PDFImage[] = [];
    for (const buffer of logos) {
      try {
        embedded.push(await doc.embedPng(buffer));
      } catch {
        // Logo illisible : ignoré, les autres restent affichés.
      }
    }
    const maxLogoHeight = topBandHeight - 20;
    const slotWidth = WIDTH / embedded.length;
    embedded.forEach((image, index) => {
      const scale = Math.min(maxLogoHeight / image.height, (slotWidth - 14) / image.width);
      const w = image.width * scale;
      const h = image.height * scale;
      const slotX = slotWidth * index;
      page.drawImage(image, { x: slotX + (slotWidth - w) / 2, y: HEIGHT - topBandHeight + (topBandHeight - h) / 2, width: w, height: h });
    });
  }

  // ─── Corps : fond coloré ────────────────────────────────────────────────────
  const footerHeight = 46;
  const bandHeight = 34;
  const bodyTop = HEIGHT - topBandHeight;
  const bodyBottom = footerHeight + bandHeight;
  page.drawRectangle({ x: 0, y: bodyBottom, width: WIDTH, height: bodyTop - bodyBottom, color: bg });
  page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: footerHeight, color: bg });

  // Logo de la JNJL (rond, en haut à droite du corps)
  const logoSize = 66;
  const logoY = bodyTop - 16 - logoSize;
  if (params.logo) {
    try {
      const image = await doc.embedJpg(params.logo);
      page.drawImage(image, { x: WIDTH - 20 - logoSize, y: logoY, width: logoSize, height: logoSize });
    } catch {
      // Logo illisible : le badge reste valide sans lui.
    }
  }

  // Titre + édition + matricule, à gauche
  const leftX = 20;
  const titleSize = 13;
  page.drawText(safe("Journée Nationale", bold), { x: leftX, y: bodyTop - 24, size: titleSize, font: bold, color: ORANGE });
  page.drawText(safe("du Jeune Leader", bold), { x: leftX, y: bodyTop - 24 - titleSize - 2, size: titleSize, font: bold, color: ORANGE });
  const editionLabel = safe(params.editionName, bold);
  const editionLabelY = bodyTop - 24 - (titleSize + 2) * 2 - 6;
  page.drawRectangle({
    x: leftX - 4,
    y: editionLabelY - 3,
    width: bold.widthOfTextAtSize(editionLabel, 9) + 8,
    height: 14,
    color: WHITE,
  });
  page.drawText(editionLabel, { x: leftX, y: editionLabelY, size: 9, font: bold, color: rgb(0, 0, 0) });
  page.drawText(safe(`Matricule : ${params.number}`, mono), {
    x: leftX,
    y: bodyTop - 24 - (titleSize + 2) * 2 - 26,
    size: 9,
    font: mono,
    color: WHITE,
  });

  // Identité : le nom se réduit (puis passe sur deux lignes) s'il est trop long
  const maxTextWidth = WIDTH - 40;
  const name = safe(params.fullName, bold);
  let cursor = logoY - 22;
  if (bold.widthOfTextAtSize(name, 12) > maxTextWidth * 1.5 || name.split(" ").length > 3) {
    const words = name.split(" ");
    const half = Math.ceil(words.length / 2);
    for (const line of [words.slice(0, half).join(" "), words.slice(half).join(" ")]) {
      centered(line, cursor, fitSize(line, bold, maxTextWidth, 16, 10), bold);
      cursor -= 18;
    }
  } else {
    centered(name, cursor, fitSize(name, bold, maxTextWidth, 16, 10), bold);
    cursor -= 18;
  }

  // QR code
  const qrSize = 88;
  const qrY = Math.max(bodyBottom + 10, cursor - 10 - qrSize);
  const qrDataUrl = await QRCode.toDataURL(params.number, { margin: 1, width: 300 });
  const qr = await doc.embedPng(qrDataUrl.split(",")[1]!);
  page.drawRectangle({ x: (WIDTH - qrSize) / 2 - 5, y: qrY - 5, width: qrSize + 10, height: qrSize + 10, color: WHITE });
  page.drawImage(qr, { x: (WIDTH - qrSize) / 2, y: qrY, width: qrSize, height: qrSize });

  // ─── Bandeau orange : Ambassadeur + région ─────────────────────────────────
  const bandY = footerHeight;
  page.drawRectangle({ x: 0, y: bandY, width: WIDTH, height: bandHeight, color: ORANGE });
  const bandText = safe(params.label.replace(" JNJL", "").toUpperCase(), bold).split("").join(" ");
  const bandSize = 11;
  centered(bandText, bandY + bandHeight - 15, bandSize, bold);
  centered(safe(params.region, font), bandY + 7, 9, font);

  // ─── Pied : date, lieu et date de délivrance ────────────────────────────────
  let footerCursor = footerHeight - 14;
  if (params.eventDate) {
    centered(safe(params.eventDate, bold), footerCursor, 10, bold, ORANGE);
    footerCursor -= 13;
  }
  if (params.editionLocation) {
    centered(safe(params.editionLocation, font), footerCursor, 7.5, font, MUTED);
    footerCursor -= 11;
  }
  centered(`Délivré le ${params.awardedAt.toLocaleDateString("fr-FR")}`, Math.max(4, footerCursor), 6.5, font, MUTED);

  return doc.save();
}
