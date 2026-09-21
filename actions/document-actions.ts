"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { uploadFile } from "@/lib/upload";
import { storagePaths } from "@/lib/storage-paths";

const DOCUMENT_TYPES = ["PERMISSION_REQUEST", "MISSION_ORDER"] as const;
type ManagedDocumentType = (typeof DOCUMENT_TYPES)[number];

const applicationSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  stage: true,
  region: { select: { id: true, name: true, code: true } },
  documents: {
    where: { type: { in: [...DOCUMENT_TYPES] } },
    select: { id: true, type: true, fileUrl: true, generatedAt: true },
  },
};

/** Candidats ayant franchi le repêchage — éligibles à la génération des documents administratifs (§8/Phase 8). */
export async function listDocumentCandidatesAction(editionId: string) {
  await requirePermission("documents.manage");

  return db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      stage: { in: ["REPECHAGE", "DOCUMENTS"] },
      selection: { status: "SELECTIONNE" },
    },
    select: applicationSelect,
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });
}

export async function uploadAmbassadorDocumentAction(formData: FormData) {
  await requirePermission("documents.manage");

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

  const uploaded = await uploadFile(file, {
    allowedTypes: ["application/pdf"],
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

  // Premier document déposé : le candidat entre officiellement dans l'étape Documents.
  if (application.stage === "REPECHAGE") {
    await db.ambassadorApplication.update({
      where: { id: applicationId },
      data: { stage: "DOCUMENTS" },
    });
  }

  return { applicationId, type };
}

export async function advanceToEngagementAction(applicationId: string) {
  await requirePermission("documents.manage");

  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: { documents: { where: { type: { in: [...DOCUMENT_TYPES] } } } },
  });
  if (!application) throw new Error("Candidature introuvable");

  const presentTypes = new Set(application.documents.map(doc => doc.type));
  const missing = DOCUMENT_TYPES.filter(type => !presentTypes.has(type));
  if (missing.length > 0) {
    throw new Error(
      `Documents manquants : ${missing.map(formatDocumentLabel).join(", ")}`
    );
  }

  await db.ambassadorApplication.update({
    where: { id: applicationId },
    data: { stage: "ENGAGEMENT" },
  });

  return { applicationId };
}

function formatDocumentLabel(type: ManagedDocumentType) {
  return type === "PERMISSION_REQUEST" ? "Demande de permission" : "Ordre de mission";
}
