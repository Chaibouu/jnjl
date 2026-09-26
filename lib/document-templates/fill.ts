import { readFileSync } from "fs";
import { join } from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export type DocxTemplateName = "permission-request" | "mission-order";

/**
 * Remplit un modèle Word (documents/*.docx d'origine, convertis en modèles avec des
 * balises {variable} — voir git blame pour le script de conversion) et retourne le
 * .docx généré. Pas de conversion PDF : Vercel n'a pas LibreOffice, et le fichier Word
 * garde exactement la mise en page, l'en-tête et la signature du document officiel.
 */
export function fillDocxTemplate(name: DocxTemplateName, data: Record<string, string>): Buffer {
  const path = join(process.cwd(), "lib", "document-templates", `${name}.docx`);
  const content = readFileSync(path, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" });
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
