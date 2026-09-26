import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { readFile } from "fs/promises";
import { join } from "path";

const WHITE = rgb(1, 1, 1);
const INK = rgb(0.05, 0.05, 0.05);

function fitSizeFor(text: string, font: PDFFont, maxWidth: number, max: number, min = 8): number {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

/**
 * Génère l'attestation de participation officielle JNJL à partir du document original
 * (lib/document-templates/attestation-base.pdf) : le fond (bordure, logos, signature,
 * cachet) est repris tel quel — seul le texte variable (nom, thème, date, lieu, édition)
 * est redessiné par-dessus, aux coordonnées exactes mesurées dans le flux du PDF source.
 */
export async function generateAttestationPdf(params: {
  ambassadorName: string;
  theme: string;
  location: string;
  eventDate: string;
  editionName: string;
}): Promise<Uint8Array> {
  const baseBytes = await readFile(join(process.cwd(), "lib", "document-templates", "attestation-base.pdf"));

  const doc = await PDFDocument.create();
  const embedded = await doc.embedPdf(baseBytes);
  const bg = embedded[0]!;
  const { width, height } = bg.scale(1);
  const page = doc.addPage([width, height]);
  page.drawPage(bg, { x: 0, y: 0, width, height });

  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const boldItalic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);

  // Zone blanche d'origine (mesurée dans le flux PDF source) : x:[102.16, 736.75] y:[101.62, 491.9].
  const contentX = 105;
  const contentWidth = 632;
  page.drawRectangle({ x: contentX, y: 200, width: contentWidth, height: 218, color: WHITE });

  const centered = (text: string, y: number, size: number, usedFont: PDFFont) => {
    const w = usedFont.widthOfTextAtSize(text, size);
    page.drawText(text, { x: contentX + (contentWidth - w) / 2, y, size, font: usedFont, color: INK });
  };

  centered("Cette attestation est décernée à", 399.79, 16, italic);
  centered(
    params.ambassadorName.toUpperCase(),
    358,
    fitSizeFor(params.ambassadorName.toUpperCase(), boldItalic, contentWidth - 20, 20),
    boldItalic
  );
  centered("Pour avoir suivi avec attention la formation sur le thème :", 322, 14, font);
  const themeLine = `« ${params.theme} »`;
  centered(themeLine, 297, fitSizeFor(themeLine, bold, contentWidth - 20, 14), bold);
  centered(`tenue à ${params.location} le ${params.eventDate}`, 272, 13, font);
  const line4 = `dans le cadre de la sélection des participants à la ${params.editionName}.`;
  centered(line4, 247, fitSizeFor(line4, font, contentWidth - 20, 13), font);
  centered(
    "En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.",
    216.17,
    11,
    italic
  );

  // Date en bas (à droite du sceau « Félicitations ») — « Lieu et Date » reste inchangé.
  const dateText = `${params.location} le ${params.eventDate}`;
  const dateBoxX = 460;
  const dateBoxWidth = 270;
  page.drawRectangle({ x: dateBoxX, y: 138, width: dateBoxWidth, height: 25, color: WHITE });
  const dateSize = fitSizeFor(dateText, italic, dateBoxWidth - 10, 13);
  const dateWidth = italic.widthOfTextAtSize(dateText, dateSize);
  page.drawText(dateText, {
    x: dateBoxX + (dateBoxWidth - dateWidth) / 2,
    y: 147.26,
    size: dateSize,
    font: italic,
    color: INK,
  });

  return doc.save();
}
