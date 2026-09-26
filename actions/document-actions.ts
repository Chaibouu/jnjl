"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { uploadFile } from "@/lib/upload";
import { storagePaths } from "@/lib/storage-paths";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";

const DOCUMENT_TYPES = ["PERMISSION_REQUEST", "MISSION_ORDER"] as const;
type ManagedDocumentType = (typeof DOCUMENT_TYPES)[number];

const applicationSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  stage: true,
  regionId: true,
  region: { select: { id: true, name: true, code: true } },
  documents: {
    where: { type: { in: [...DOCUMENT_TYPES] } },
    select: { id: true, type: true, fileUrl: true, generatedAt: true },
  },
};

/**
 * Vue admin des documents administratifs : demande de permission et ordre de mission,
 * générés en libre-service par l'ambassadeur dès sa fiche d'engagement signée (§ pipeline
 * ambassadeur). L'admin peut consulter, ou téléverser lui-même un document de secours.
 */
export async function listDocumentCandidatesAction(editionId: string) {
  const actor = await requirePermission("documents.manage");
  const regionId = getActorRegionScope(actor);

  return db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      selection: { status: "SELECTIONNE" },
      ...(regionId ? { regionId } : {}),
    },
    select: applicationSelect,
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });
}

/** Dépôt de secours par l'admin — l'ambassadeur génère normalement ces documents lui-même. */
export async function uploadAmbassadorDocumentAction(formData: FormData) {
  const actor = await requirePermission("documents.manage");

  const applicationId = formData.get("applicationId");
  const type = formData.get("type");
  const file = formData.get("file");

  if (typeof applicationId !== "string" || !applicationId) {
    throw new Error("Candidature invalide");
  }
  if (typeof type !== "string" || !DOCUMENT_TYPES.includes(type as ManagedDocumentType)) {
    throw new Error("Type de document invalide");
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun fichier fourni");
  }

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: { edition: { select: { year: true } } },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);

  const uploaded = await uploadFile(file, {
    // .docx (format généré par l'ambassadeur en libre-service) ou PDF (secours numérisé/signé).
    allowedTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    destination: storagePaths.document(application.edition.year),
  });

  // Un seul document par type et par candidature : on remplace l'existant.
  await db.document.deleteMany({
    where: { ambassadorApplicationId: applicationId, type: type as ManagedDocumentType },
  });

  await db.document.create({
    data: {
      type: type as ManagedDocumentType,
      fileUrl: uploaded.path,
      ambassadorApplicationId: applicationId,
      userId: application.userId,
    },
  });

  return { applicationId, type };
}
