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
 * - « a6x4 » : 4 badges A6 (10,5 × 14,8 cm) par feuille A4 en portrait, avec repères de coupe ;
 * - « a5 »   : un badge A5 par page (taille d'origine).
 */
export type BadgeLayout = "a6x4" | "a5";

export const BADGE_LAYOUT_OPTIONS: { value: BadgeLayout; label: string }[] = [
  { value: "a6x4", label: "4 badges A6 par feuille A4 (recommandé)" },
  { value: "a5", label: "1 badge A5 par page" },
];

// A4 et A6 en points PDF (1 pt = 1/72 pouce). Quatre A6 occupent exactement une feuille A4 (2 × 2).
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const A6_WIDTH = 297.64;
const A6_HEIGHT = 419.53;

/**
 * Impression en lot : demande au serveur les parties 0, 1, 2… d'une même sélection, les assemble en un seul PDF
 * et le télécharge. `fetchPart` renvoie `null` quand il n'y a rien à imprimer.
 */
export async function downloadBadgesInParts(
  fetchPart: (part: number) => Promise<{ base64: string; totalParts: number } | null>,
  filename: string,
  layout: BadgeLayout = "a6x4",
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

  const suffix = layout === "a6x4" ? "-A6x4" : "-A5";
  const name = filename.replace(/\.pdf$/i, "") + suffix + ".pdf";

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

  if (layout === "a5") {
    for (const base64 of parts) {
      const source = await PDFDocument.load(Uint8Array.from(atob(base64), char => char.charCodeAt(0)));
      const pages = await out.copyPages(source, source.getPageIndices());
      pages.forEach(page => out.addPage(page));
    }
  } else {
    // Imposition : chaque badge A5 est réduit à l'échelle A6 et placé dans l'une des 4 cases de la feuille A4.
    const cells = [
      { x: 0, y: A6_HEIGHT },
      { x: A6_WIDTH, y: A6_HEIGHT },
      { x: 0, y: 0 },
      { x: A6_WIDTH, y: 0 },
    ];
    const grey = rgb(0.55, 0.55, 0.55);
    let sheet: ReturnType<typeof out.addPage> | null = null;
    let slot = 0;

    for (const base64 of parts) {
      const source = await PDFDocument.load(Uint8Array.from(atob(base64), char => char.charCodeAt(0)));
      const embedded = await out.embedPdf(source, source.getPageIndices());
      for (const page of embedded) {
        if (!sheet || slot === 4) {
          sheet = out.addPage([A4_WIDTH, A4_HEIGHT]);
          slot = 0;
          // Repères de coupe discrets sur les bords de la feuille, jamais sur les badges.
          const tick = 8;
          for (const x of [A6_WIDTH]) {
            sheet.drawLine({ start: { x, y: 0 }, end: { x, y: tick }, thickness: 0.4, color: grey });
            sheet.drawLine({ start: { x, y: A4_HEIGHT }, end: { x, y: A4_HEIGHT - tick }, thickness: 0.4, color: grey });
          }
          for (const y of [A6_HEIGHT, A6_HEIGHT * 2]) {
            sheet.drawLine({ start: { x: 0, y }, end: { x: tick, y }, thickness: 0.4, color: grey });
            sheet.drawLine({ start: { x: A4_WIDTH, y }, end: { x: A4_WIDTH - tick, y }, thickness: 0.4, color: grey });
          }
        }
        const cell = cells[slot];
        // Échelle déduite de la page elle-même : le badge remplit exactement sa case A6.
        const scale = A6_WIDTH / page.width;
        sheet.drawPage(page, { x: cell.x, y: cell.y, xScale: scale, yScale: scale });
        slot += 1;
      }
    }
  }

  return out.save();
}
