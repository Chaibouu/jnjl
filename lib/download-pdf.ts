/** Téléchargements de PDF côté navigateur (fichiers reçus du serveur en base64). */

export function downloadPdfBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Impression en lot : demande au serveur les parties 0, 1, 2… d'une même sélection, les assemble en un seul PDF
 * (une page par badge) et le télécharge. `fetchPart` renvoie `null` quand il n'y a rien à imprimer.
 */
export async function downloadBadgesInParts(
  fetchPart: (part: number) => Promise<{ base64: string; totalParts: number } | null>,
  filename: string,
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
  if (parts.length === 1) {
    downloadPdfBase64(parts[0], filename);
    return true;
  }

  // pdf-lib n'est chargé qu'à l'impression en lot (bibliothèque assez lourde pour le navigateur).
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  for (const base64 of parts) {
    const source = await PDFDocument.load(Uint8Array.from(atob(base64), char => char.charCodeAt(0)));
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach(page => merged.addPage(page));
  }
  const bytes = await merged.save();
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  downloadPdfBase64(btoa(binary), filename);
  return true;
}
