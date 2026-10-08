"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { ForbiddenError } from "@/lib/forbidden-error";
import { saveFile } from "@/lib/storage";
import { storagePaths } from "@/lib/storage-paths";
import { fillDocxTemplate, DOCX_MIME } from "@/lib/document-templates/fill";
import type { User } from "@/types/user";
import { getActorRegionScope } from "@/lib/region-scope";
import { OFFICIAL_ENGAGEMENT_TEXT } from "@/lib/engagement-format";

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
  const actor = await requirePermission("engagement.manage");
  const regionId = getActorRegionScope(actor);

  return db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      stage: { in: ["ENGAGEMENT", "BADGE", "EMBARQUEMENT", "PRESENCE", "ATTESTATION"] },
      ...(regionId ? { regionId } : {}),
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
  const profile = await db.userProfile.findUnique({ where: { userId: user.id }, select: { city: true } });

  return {
    stage: application.stage,
    // Texte de la fiche affiché avant signature : celui de l'édition, sinon le texte officiel du modèle Word.
    engagementText: edition.engagementText?.trim() || OFFICIAL_ENGAGEMENT_TEXT,
    engagement: application.engagement,
    fullName: `${application.firstName} ${application.lastName}`,
    region: application.region.name,
    editionName: `${edition.name} (${edition.year})`,
    // Champs de la fiche d'inscription, préremplis avec les informations déjà connues.
    form: {
      nom: application.lastName ?? "",
      prenom: application.firstName ?? "",
      sexe: (application.gender === "FEMININ" ? "FEMININ" : application.gender === "MASCULIN" ? "MASCULIN" : "") as
        | "MASCULIN"
        | "FEMININ"
        | "",
      email: application.email ?? "",
      telephone: application.phone ?? "",
      lieuResidence: profile?.city?.trim() ?? "",
    },
  };
}

export type EngagementFormInput = {
  nom: string;
  prenom: string;
  sexe: "MASCULIN" | "FEMININ";
  email: string;
  telephone: string;
  lieuResidence: string;
};

/**
 * Signe la fiche d'engagement pour le compte connecté. L'ambassadeur confirme ou complète les
 * champs de la fiche d'inscription (préremplis) ; ils sont reportés tels quels dans le modèle Word
 * officiel, avec son nom complet et la date de signature sous « SIGNATURE ».
 */
export async function signEngagementAction(input: EngagementFormInput) {
  const user = await getCurrentUser();

  const nom = input.nom?.trim() ?? "";
  const prenom = input.prenom?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const telephone = input.telephone?.trim() ?? "";
  const lieuResidence = input.lieuResidence?.trim() ?? "";
  if (nom.length < 2) throw new Error("Renseignez votre nom");
  if (prenom.length < 2) throw new Error("Renseignez votre prénom");
  if (input.sexe !== "MASCULIN" && input.sexe !== "FEMININ") throw new Error("Renseignez votre sexe");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Adresse e-mail invalide");
  if (telephone.replace(/\D/g, "").length < 8) throw new Error("Numéro de téléphone invalide");
  if (lieuResidence.length < 2) throw new Error("Renseignez votre lieu de résidence");

  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) throw new Error("Aucune édition active");

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
  });
  if (!application) throw new Error("Aucune candidature ambassadeur trouvée pour votre compte");
  if (application.stage !== "ENGAGEMENT") {
    throw new Error("Vous ne pouvez pas encore signer la fiche d'engagement à cette étape");
  }

  const existing = await db.engagement.findUnique({
    where: { ambassadorApplicationId: application.id },
  });
  if (existing) throw new Error("La fiche d'engagement a déjà été signée");

  const fullName = `${prenom} ${nom}`;
  const acceptedAt = new Date();

  // Fiche générée à partir du modèle Word officiel (documents/news/FICHE D'ENGAGEMENT JNJL6.docx) :
  // mise en page, logos et texte d'origine conservés ; seuls les champs et la signature sont remplis.
  const buffer = fillDocxTemplate("engagement", {
    nom_complet: fullName,
    nom,
    prenom,
    sexe: input.sexe === "FEMININ" ? "Féminin" : "Masculin",
    email,
    telephone,
    lieu_residence: lieuResidence,
    date_signature: acceptedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    heure_signature: acceptedAt.toLocaleTimeString("fr-FR"),
  });

  const fileUrl = await saveFile({
    folder: storagePaths.engagement(edition.year),
    filename: `${randomUUID()}.docx`,
    body: new Uint8Array(buffer),
    contentType: DOCX_MIME,
  });

  await db.$transaction([
    db.engagement.create({
      data: {
        ambassadorApplicationId: application.id,
        signatureName: fullName,
        fileUrl,
        acceptedAt,
      },
    }),
    // Informations complétées par l'ambassadeur : on ne remplace que ce qui manquait.
    db.ambassadorApplication.update({
      where: { id: application.id },
      data: { stage: "BADGE", ...(application.gender ? {} : { gender: input.sexe }) },
    }),
    db.userProfile.updateMany({ where: { userId: user.id, city: null }, data: { city: lieuResidence } }),
  ]);

  return { fileUrl };
}
