/** Téléchargements de PDF côté navigateur (fichiers reçus du serveur en base64). */

export function downloadPdfBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  downloadPdfBytes(bytes, filename);
}

function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Mise en page de l'impression en lot :
 * - « a5x2 » : 2 badges A5 (14,8 × 21 cm, taille réelle) par feuille A4 en paysage, côte à côte ;
 * - « a6x4 » : 4 badges A6 (10,5 × 14,8 cm) par feuille A4 en portrait, en 2 × 2 ;
 * - « a5 »   : un badge A5 par page (taille d'origine).
 * Les deux premières ajoutent de petits repères de coupe sur les bords de la feuille.
 */
export type BadgeLayout = "a5x2" | "a6x4" | "a5";

export const BADGE_LAYOUT_OPTIONS: { value: BadgeLayout; label: string }[] = [
  { value: "a5x2", label: "2 badges A5 par feuille A4 (recommandé)" },
  { value: "a6x4", label: "4 badges A6 par feuille A4" },
  { value: "a5", label: "1 badge A5 par page" },
];

// Formats en points PDF (1 pt = 1/72 pouce). Deux A5 portrait remplissent exactement un A4 paysage,
// quatre A6 remplissent exactement un A4 portrait.
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const A5_WIDTH = 419.53;
const A5_HEIGHT = 595.28;
const A6_WIDTH = 297.64;
const A6_HEIGHT = 419.53;

/** Feuille A4 découpée en cases : taille de la feuille, d'une case, et nombre de colonnes / lignes. */
const SHEETS: Record<Exclude<BadgeLayout, "a5">, { sheetW: number; sheetH: number; cellW: number; cellH: number; cols: number; rows: number }> = {
  a5x2: { sheetW: A4_HEIGHT, sheetH: A4_WIDTH, cellW: A5_WIDTH, cellH: A5_HEIGHT, cols: 2, rows: 1 },
  a6x4: { sheetW: A4_WIDTH, sheetH: A4_HEIGHT, cellW: A6_WIDTH, cellH: A6_HEIGHT, cols: 2, rows: 2 },
};

const LAYOUT_SUFFIX: Record<BadgeLayout, string> = { a5x2: "-A5x2", a6x4: "-A6x4", a5: "-A5" };

/**
 * Impression en lot : demande au serveur les parties 0, 1, 2… d'une même sélection, les assemble en un seul PDF
 * et le télécharge. `fetchPart` renvoie `null` quand il n'y a rien à imprimer.
 */
export async function downloadBadgesInParts(
  fetchPart: (part: number) => Promise<{ base64: string; totalParts: number } | null>,
  filename: string,
  layout: BadgeLayout = "a5x2",
  onProgress?: (done: number, total: number) => void
): Promise<boolean> {
  const parts: string[] = [];
  let total = 1;
  for (let part = 0; part < total; part++) {
    const result = await fetchPart(part);
    if (!result) break;
    total = result.totalParts;
    parts.push(result.base64);
    onProgress?.(part + 1, total);
  }
  if (parts.length === 0) return false;

  const name = filename.replace(/\.pdf$/i, "") + LAYOUT_SUFFIX[layout] + ".pdf";

  if (layout === "a5" && parts.length === 1) {
    downloadPdfBase64(parts[0], name);
    return true;
  }

  downloadPdfBytes(await composeBadgePdf(parts, layout), name);
  return true;
}

/**
 * Assemble les parties (PDF en base64, une page A5 par badge) en un seul PDF selon la mise en page demandée.
 * Fonction pure, sans accès au navigateur : testable côté Node.
 */
export async function composeBadgePdf(parts: string[], layout: BadgeLayout): Promise<Uint8Array> {
  // pdf-lib n'est chargé qu'à l'impression en lot (bibliothèque assez lourde pour le navigateur).
  const { PDFDocument, rgb } = await import("pdf-lib");
  const out = await PDFDocument.create();
  const decode = (base64: string) => Uint8Array.from(atob(base64), char => char.charCodeAt(0));

  if (layout === "a5") {
    for (const base64 of parts) {
      const source = await PDFDocument.load(decode(base64));
      const pages = await out.copyPages(source, source.getPageIndices());
      pages.forEach(page => out.addPage(page));
    }
    return out.save();
  }

  // Imposition : chaque badge est réduit (ou gardé) à la taille de sa case et placé sur une feuille A4.
  const { sheetW, sheetH, cellW, cellH, cols, rows } = SHEETS[layout];
  const perSheet = cols * rows;
  const grey = rgb(0.55, 0.55, 0.55);
  const tick = 8;
  let sheet: ReturnType<typeof out.addPage> | null = null;
  let slot = 0;

  for (const base64 of parts) {
    const source = await PDFDocument.load(decode(base64));
    const embedded = await out.embedPdf(source, source.getPageIndices());
    for (const page of embedded) {
      if (!sheet || slot === perSheet) {
        sheet = out.addPage([sheetW, sheetH]);
        slot = 0;
        // Repères de coupe discrets sur les bords de la feuille, jamais sur les badges.
        for (let col = 1; col < cols; col++) {
          const x = col * cellW;
          sheet.drawLine({ start: { x, y: 0 }, end: { x, y: tick }, thickness: 0.4, color: grey });
          sheet.drawLine({ start: { x, y: sheetH }, end: { x, y: sheetH - tick }, thickness: 0.4, color: grey });
        }
        for (let row = 1; row < rows; row++) {
          const y = row * cellH;
          sheet.drawLine({ start: { x: 0, y }, end: { x: tick, y }, thickness: 0.4, color: grey });
          sheet.drawLine({ start: { x: sheetW, y }, end: { x: sheetW - tick, y }, thickness: 0.4, color: grey });
        }
      }
      // Cases remplies de gauche à droite, puis de haut en bas.
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = col * cellW;
      const y = sheetH - (row + 1) * cellH;
      // Échelle déduite de la page elle-même : le badge remplit exactement sa case.
      const scale = cellW / page.width;
      sheet.drawPage(page, { x, y, xScale: scale, yScale: scale });
      slot += 1;
    }
  }
  return out.save();
}
