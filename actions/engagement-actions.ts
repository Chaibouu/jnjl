"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { ForbiddenError } from "@/lib/forbidden-error";
import { saveFile } from "@/lib/storage";
import { storagePaths } from "@/lib/storage-paths";
import { generateEngagementPdf } from "@/lib/generate-engagement-pdf";
import type { User } from "@/types/user";

async function getCurrentUser(): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  return user;
}

// ─────────────────────────────────────────────────────────────
// Administration
// ─────────────────────────────────────────────────────────────

export async function getEditionEngagementAction(editionId: string) {
  await requirePermission("engagement.manage");
  const edition = await db.edition.findUnique({
    where: { id: editionId },
    select: { id: true, name: true, year: true, engagementText: true },
  });
  if (!edition) throw new Error("Édition introuvable");
  return edition;
}

export async function setEditionEngagementTextAction(editionId: string, text: string) {
  await requirePermission("engagement.manage");
  const trimmed = text.trim();
  if (trimmed.length < 20) {
    throw new Error("La fiche d'engagement doit contenir au moins 20 caractères");
  }

  await db.edition.update({
    where: { id: editionId },
    data: { engagementText: trimmed },
  });

  return { editionId };
}

export async function listEngagementStatusAction(editionId: string) {
  await requirePermission("engagement.manage");

  return db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      stage: { in: ["ENGAGEMENT", "BADGE", "EMBARQUEMENT", "PRESENCE", "ATTESTATION"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      region: { select: { name: true } },
      engagement: {
        select: { signatureName: true, fileUrl: true, acceptedAt: true },
      },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });
}

// ─────────────────────────────────────────────────────────────
// Espace ambassadeur
// ─────────────────────────────────────────────────────────────

export async function getMyEngagementAction() {
  const user = await getCurrentUser();
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return null;

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
    include: { engagement: true, region: { select: { name: true } } },
  });
  if (!application) return null;

  return {
    stage: application.stage,
    engagementText: edition.engagementText,
    engagement: application.engagement,
    // Pour l'aperçu de la fiche avant signature.
    fullName: `${application.firstName} ${application.lastName}`,
    region: application.region.name,
    editionName: `${edition.name} (${edition.year})`,
  };
}

export async function signEngagementAction(signatureName: string) {
  const user = await getCurrentUser();
  const trimmedName = signatureName.trim();
  if (trimmedName.length < 3) {
    throw new Error("Veuillez saisir votre nom complet pour signer");
  }

  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) throw new Error("Aucune édition active");
  if (!edition.engagementText) {
    throw new Error("La fiche d'engagement n'a pas encore été rédigée par l'administration");
  }

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
    include: { region: { select: { name: true } } },
  });
  if (!application) throw new Error("Aucune candidature ambassadeur trouvée pour votre compte");
  if (application.stage !== "ENGAGEMENT") {
    throw new Error("Vous ne pouvez pas encore signer la fiche d'engagement à cette étape");
  }

  const existing = await db.engagement.findUnique({
    where: { ambassadorApplicationId: application.id },
  });
  if (existing) throw new Error("La fiche d'engagement a déjà été signée");

  const acceptedAt = new Date();
  const pdfBytes = await generateEngagementPdf({
    editionName: `${edition.name} (${edition.year})`,
    ambassadorName: `${application.firstName} ${application.lastName}`,
    region: application.region.name,
    engagementText: edition.engagementText,
    signatureName: trimmedName,
    acceptedAt,
  });

  const fileUrl = await saveFile({
    folder: storagePaths.engagement(edition.year),
    filename: `${randomUUID()}.pdf`,
    body: pdfBytes,
    contentType: "application/pdf",
  });

  await db.$transaction([
    db.engagement.create({
      data: {
        ambassadorApplicationId: application.id,
        signatureName: trimmedName,
        fileUrl,
        acceptedAt,
      },
    }),
    db.ambassadorApplication.update({
      where: { id: application.id },
      data: { stage: "BADGE" },
    }),
  ]);

  return { fileUrl };
}
