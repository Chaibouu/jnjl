import { generate } from "@pdfme/generator";
import { barcodes, ellipse, image, line, rectangle, text } from "@pdfme/schemas";
import { db } from "@/lib/db";
import type { PdfmeTemplate, TemplateType } from "./definitions";

/** Blocs disponibles dans l'éditeur ET à la génération : les deux listes doivent rester identiques. */
export const PDFME_PLUGINS = { text, image, qrcode: barcodes.qrcode, rectangle, ellipse, line };

/**
 * Un bloc dont le contenu contient « {variable} » doit être en lecture seule pour que pdfme
 * remplace la variable : on le garantit ici plutôt que de compter sur l'administrateur.
 */
export function normalizeTemplate(template: PdfmeTemplate): PdfmeTemplate {
  return {
    ...template,
    schemas: template.schemas.map(page =>
      page.map(schema => {
        const content = schema.content;
        return typeof content === "string" && /\{[^{}]+\}/.test(content) ? { ...schema, readOnly: true } : schema;
      })
    ),
  };
}

export function isPdfmeTemplate(value: unknown): value is PdfmeTemplate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as PdfmeTemplate;
  return (
    !!candidate.basePdf &&
    typeof candidate.basePdf === "object" &&
    Array.isArray(candidate.schemas) &&
    candidate.schemas.every(page => Array.isArray(page))
  );
}

export async function renderTemplatePdf(
  template: PdfmeTemplate,
  variables: Record<string, string>
): Promise<Uint8Array> {
  const normalized = normalizeTemplate(template);
  // Toutes les variables du type de document sont fournies : une variable inconnue resterait affichée telle quelle.
  return generate({
    template: normalized as never,
    inputs: [variables],
    plugins: PDFME_PLUGINS as never,
  });
}

/**
 * PDF issu du modèle actif de l'édition, ou `null` (pas de modèle, ou erreur) :
 * l'appelant retombe alors sur la génération historique — un modèle défaillant ne bloque jamais un document.
 */
export async function renderActiveTemplate(
  type: TemplateType,
  editionId: string | undefined,
  variables: Record<string, string>
): Promise<Uint8Array | null> {
  if (!editionId) return null;
  try {
    const active = await db.documentTemplate.findFirst({
      where: { editionId, type, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!active || !isPdfmeTemplate(active.template)) return null;
    return await renderTemplatePdf(active.template, variables);
  } catch (error) {
    console.error(`Modèle PDF ${type} inutilisable, génération historique utilisée`, error);
    return null;
  }
}
