import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";

// A6 portrait, en points (105 × 148 mm) : format d'un badge de conférence.
const WIDTH = 297.64;
const HEIGHT = 419.53;
const ORANGE = rgb(0.941, 0.451, 0.129); // #F07321
const INK = rgb(0.157, 0.157, 0.157); // #282828
const MUTED = rgb(0.45, 0.45, 0.45);

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
  label: string;
  fullName: string;
  region: string;
  editionName: string;
  number: string;
  awardedAt: Date;
  /** Contenu du logo (JPEG) — le badge est généré sans logo s'il est absent. */
  logo?: Uint8Array | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const page = doc.addPage([WIDTH, HEIGHT]);

  const centered = (text: string, y: number, size: number, usedFont: PDFFont, color = INK) => {
    const value = safe(text, usedFont);
    const width = usedFont.widthOfTextAtSize(value, size);
    page.drawText(value, { x: (WIDTH - width) / 2, y, size, font: usedFont, color });
  };

  // Cadre
  page.drawRectangle({ x: 0.5, y: 0.5, width: WIDTH - 1, height: HEIGHT - 1, borderColor: rgb(0.85, 0.85, 0.87), borderWidth: 1 });

  // Logo de la JNJL
  const logoSize = 100;
  const logoY = HEIGHT - 18 - logoSize;
  if (params.logo) {
    try {
      const image = await doc.embedJpg(params.logo);
      page.drawImage(image, { x: (WIDTH - logoSize) / 2, y: logoY, width: logoSize, height: logoSize });
    } catch {
      // Logo illisible : le badge reste valide sans lui.
    }
  }

  // Bandeau « AMBASSADEUR »
  const bandHeight = 26;
  const bandY = logoY - 8 - bandHeight;
  page.drawRectangle({ x: 0, y: bandY, width: WIDTH, height: bandHeight, color: ORANGE });
  const bandText = safe(params.label.replace(" JNJL", "").toUpperCase(), bold).split("").join(" ");
  const bandSize = 11;
  const bandWidth = bold.widthOfTextAtSize(bandText, bandSize);
  page.drawText(bandText, { x: (WIDTH - bandWidth) / 2, y: bandY + 8.5, size: bandSize, font: bold, color: rgb(1, 1, 1) });

  // Identité : le nom se réduit (puis passe sur deux lignes) s'il est trop long
  const maxTextWidth = WIDTH - 40;
  const name = safe(params.fullName, bold);
  let cursor = bandY - 30;
  if (bold.widthOfTextAtSize(name, 12) > maxTextWidth * 1.5 || name.split(" ").length > 3) {
    const words = name.split(" ");
    const half = Math.ceil(words.length / 2);
    for (const line of [words.slice(0, half).join(" "), words.slice(half).join(" ")]) {
      centered(line, cursor, fitSize(line, bold, maxTextWidth, 18, 10), bold);
      cursor -= 20;
    }
    cursor += 20;
  } else {
    centered(name, cursor, fitSize(name, bold, maxTextWidth, 21, 10), bold);
  }
  centered(`Région de ${params.region}`, cursor - 19, 11, bold, ORANGE);
  centered(params.editionName, cursor - 34, 9, font, MUTED);

  // QR code
  const qrSize = 104;
  const qrY = cursor - 34 - 14 - qrSize;
  const qrDataUrl = await QRCode.toDataURL(params.number, { margin: 1, width: 300 });
  const qr = await doc.embedPng(qrDataUrl.split(",")[1]!);
  page.drawRectangle({ x: (WIDTH - qrSize) / 2 - 5, y: qrY - 5, width: qrSize + 10, height: qrSize + 10, borderColor: rgb(0.85, 0.85, 0.87), borderWidth: 0.8 });
  page.drawImage(qr, { x: (WIDTH - qrSize) / 2, y: qrY, width: qrSize, height: qrSize });

  // Numéro et date
  centered(params.number, qrY - 24, 11, mono);
  centered(`Délivré le ${params.awardedAt.toLocaleDateString("fr-FR")}`, 16, 8, font, MUTED);

  return doc.save();
}
