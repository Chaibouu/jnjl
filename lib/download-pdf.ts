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

// Les mises en page sont définies dans un module partagé avec le serveur (taille d'impression du texte).
import { SHEETS, type BadgeLayout } from "@/lib/badge-layouts";

export { BADGE_LAYOUT_OPTIONS, type BadgeLayout } from "@/lib/badge-layouts";

const LAYOUT_SUFFIX: Record<BadgeLayout, string> = { a9: "-9par-A4", a6x4: "-A6x4", a5: "-A5" };

/**
 * Impression en lot : demande au serveur les parties 0, 1, 2… d'une même sélection, les assemble en un seul PDF
 * et le télécharge. `fetchPart` renvoie `null` quand il n'y a rien à imprimer.
 */
export async function downloadBadgesInParts(
  fetchPart: (part: number) => Promise<{ base64: string; totalParts: number } | null>,
  filename: string,
  layout: BadgeLayout = "a9",
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

  // Imposition : chaque badge est réduit à la taille de sa case et placé sur une feuille A4 (grille centrée).
  const { sheetW, sheetH, cellW, cellH, cols, rows, gapX, gapY } = SHEETS[layout];
  const perSheet = cols * rows;
  const marginX = (sheetW - cols * cellW - (cols - 1) * gapX) / 2;
  const marginY = (sheetH - rows * cellH - (rows - 1) * gapY) / 2;
  const grey = rgb(0.55, 0.55, 0.55);
  const tick = 8;
  let sheet: ReturnType<typeof out.addPage> | null = null;
  let slot = 0;

  const cellX = (col: number) => marginX + col * (cellW + gapX);
  const cellTop = (row: number) => sheetH - marginY - row * (cellH + gapY);

  for (const base64 of parts) {
    const source = await PDFDocument.load(decode(base64));
    const embedded = await out.embedPdf(source, source.getPageIndices());
    for (const page of embedded) {
      if (!sheet || slot === perSheet) {
        sheet = out.addPage([sheetW, sheetH]);
        slot = 0;
        // Repères de coupe discrets : de part et d'autre de chaque bord de case, en haut/en bas et à gauche/à droite.
        const xs = new Set<number>();
        for (let col = 0; col < cols; col++) {
          xs.add(Number(cellX(col).toFixed(2)));
          xs.add(Number((cellX(col) + cellW).toFixed(2)));
        }
        const ys = new Set<number>();
        for (let row = 0; row < rows; row++) {
          ys.add(Number(cellTop(row).toFixed(2)));
          ys.add(Number((cellTop(row) - cellH).toFixed(2)));
        }
        for (const x of xs) {
          if (x <= 0.5 || x >= sheetW - 0.5) continue;
          sheet.drawLine({ start: { x, y: 0 }, end: { x, y: tick }, thickness: 0.4, color: grey });
          sheet.drawLine({ start: { x, y: sheetH }, end: { x, y: sheetH - tick }, thickness: 0.4, color: grey });
        }
        for (const y of ys) {
          if (y <= 0.5 || y >= sheetH - 0.5) continue;
          sheet.drawLine({ start: { x: 0, y }, end: { x: tick, y }, thickness: 0.4, color: grey });
          sheet.drawLine({ start: { x: sheetW, y }, end: { x: sheetW - tick, y }, thickness: 0.4, color: grey });
        }
      }
      // Cases remplies de gauche à droite, puis de haut en bas.
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      // Échelle déduite de la page elle-même : le badge remplit exactement sa case.
      const scale = cellW / page.width;
      sheet.drawPage(page, { x: cellX(col), y: cellTop(row) - cellH, xScale: scale, yScale: scale });
      slot += 1;
    }
  }
  return out.save();
}
