"use server";

import sharp from "sharp";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { getAppUrl } from "@/lib/app-url";
import {
  TEMPLATE_TYPES,
  defaultTemplate,
  isTemplateType,
  sampleVariables,
  type PdfmeTemplate,
  type TemplateType,
} from "@/lib/pdf-templates/definitions";
import { isPdfmeTemplate, normalizeTemplate, renderTemplatePdf } from "@/lib/pdf-templates/render";

const PERMISSION = "documents.manage";
/** Un modèle embarque ses images (logo…) : on borne sa taille pour ne pas alourdir la base. */
const MAX_TEMPLATE_BYTES = 1_500_000;

/** Logo de la JNJL réduit et encodé en data URL, intégré aux modèles de badge et d'engagement par défaut. */
async function loadDefaultLogo(): Promise<string | null> {
  try {
    const response = await fetch(`${getAppUrl()}/jnjl.jpg`);
    if (!response.ok) return null;
    const small = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(240, 240, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${small.toString("base64")}`;
  } catch {
    return null;
  }
}

function assertValidTemplate(value: unknown): PdfmeTemplate {
  if (!isPdfmeTemplate(value)) throw new Error("Modèle invalide");
  if (JSON.stringify(value).length > MAX_TEMPLATE_BYTES) {
    throw new Error("Modèle trop volumineux : réduisez la taille des images intégrées");
  }
  return normalizeTemplate(value);
}

/** Modèles de toutes les éditions (liste légère, sans le contenu). */
export async function listDocumentTemplatesAction() {
  await requirePermission(PERMISSION);
  return db.documentTemplate.findMany({
    select: {
      id: true,
      editionId: true,
      type: true,
      name: true,
      isActive: true,
      updatedAt: true,
      edition: { select: { name: true, year: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getDocumentTemplateAction(id: string) {
  await requirePermission(PERMISSION);
  const template = await db.documentTemplate.findUnique({
    where: { id },
    include: { edition: { select: { name: true, year: true } } },
  });
  if (!template) throw new Error("Modèle introuvable");
  return template;
}

/** Crée un modèle : à partir du modèle par défaut du type, ou en copiant un modèle existant (autre édition comprise). */
export async function createDocumentTemplateAction(input: {
  editionId: string;
  type: TemplateType;
  name: string;
  copyFromId?: string | null;
}) {
  await requirePermission(PERMISSION);
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Donnez un nom au modèle");
  if (!isTemplateType(input.type)) throw new Error("Type de document invalide");

  const edition = await db.edition.findFirst({ where: { id: input.editionId, isDeleted: false } });
  if (!edition) throw new Error("Édition introuvable");

  let content: PdfmeTemplate;
  if (input.copyFromId) {
    const source = await db.documentTemplate.findUnique({ where: { id: input.copyFromId } });
    if (!source || source.type !== input.type) throw new Error("Le modèle à copier est introuvable ou d'un autre type");
    content = assertValidTemplate(source.template);
  } else {
    const needsLogo = input.type === "BADGE" || input.type === "ENGAGEMENT";
    content = defaultTemplate(input.type, needsLogo ? await loadDefaultLogo() : null);
  }

  const created = await db.documentTemplate.create({
    data: {
      editionId: input.editionId,
      type: input.type,
      name,
      template: content as never,
      isActive: false,
    },
  });
  return { id: created.id };
}

export async function saveDocumentTemplateAction(id: string, input: { name: string; template: unknown }) {
  await requirePermission(PERMISSION);
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Donnez un nom au modèle");
  const template = assertValidTemplate(input.template);

  await db.documentTemplate.update({ where: { id }, data: { name, template: template as never } });
  return { id };
}

/** Active un modèle (les autres modèles du même type et de la même édition sont désactivés) ou le désactive. */
export async function setDocumentTemplateActiveAction(id: string, active: boolean) {
  await requirePermission(PERMISSION);
  const template = await db.documentTemplate.findUnique({ where: { id } });
  if (!template) throw new Error("Modèle introuvable");

  if (!active) {
    await db.documentTemplate.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.$transaction([
      db.documentTemplate.updateMany({
        where: { editionId: template.editionId, type: template.type, isActive: true },
        data: { isActive: false },
      }),
      db.documentTemplate.update({ where: { id }, data: { isActive: true } }),
    ]);
  }
  return { id, active };
}

export async function deleteDocumentTemplateAction(id: string) {
  await requirePermission(PERMISSION);
  await db.documentTemplate.delete({ where: { id } });
  return { id };
}

/** Aperçu du modèle en cours d'édition (même moteur que la génération réelle), avec des données d'exemple. */
export async function previewDocumentTemplateAction(type: TemplateType, template: unknown) {
  await requirePermission(PERMISSION);
  if (!isTemplateType(type)) throw new Error("Type de document invalide");
  const valid = assertValidTemplate(template);

  const pdf = await renderTemplatePdf(valid, sampleVariables(type));
  return {
    filename: `apercu-${TEMPLATE_TYPES[type].label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
    base64: Buffer.from(pdf).toString("base64"),
  };
}
