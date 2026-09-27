"use server";

import { db } from "@/lib/db";
import { generateBadgePdf } from "@/lib/generate-badge-pdf";
import { loadPublicImage, PARTNER_LOGO_PATHS } from "@/lib/badge-assets";

/** Numérotation séquentielle des badges participants, par édition. */
async function nextParticipantBadgeNumber(editionYear: number, editionId: string) {
  const count = await db.eventParticipation.count({
    where: { editionId, badgeNumber: { not: null } },
  });
  return `JNJL-${editionYear}-PART-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Crée la participation et le badge d'un participant à l'événement, immédiatement après
 * son inscription (§8 du guide admin) : aucune validation admin n'est requise, le badge
 * est disponible dès l'inscription, comme pour le badge ambassadeur mais sans compte requis.
 */
export async function createParticipantBadge(params: {
  eventApplicationId: string;
  editionId: string;
  editionYear: number;
  userId?: string | null;
}) {
  const number = await nextParticipantBadgeNumber(params.editionYear, params.editionId);
  return db.eventParticipation.create({
    data: {
      editionId: params.editionId,
      userId: params.userId ?? null,
      eventApplicationId: params.eventApplicationId,
      badgeNumber: number,
      qrCode: number,
    },
  });
}

/**
 * Résumé public du badge d'un participant. Aucune authentification requise : accessible
 * juste après l'inscription via l'identifiant (non devinable) de la candidature, comme
 * la confirmation affichée sur la page `/participer`.
 */
export async function getParticipantBadgeAction(applicationId: string) {
  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    include: {
      edition: true,
      region: { select: { name: true } },
      participation: true,
    },
  });
  if (!application || !application.participation?.badgeNumber) {
    throw new Error("Badge introuvable");
  }

  const edition = application.edition;
  const eventDate =
    edition.startDate && edition.endDate
      ? edition.startDate.getTime() === edition.endDate.getTime()
        ? edition.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
        : `${edition.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${edition.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
      : null;

  return {
    fullName: `${application.firstName} ${application.lastName}`,
    region: application.region?.name ?? "Niger",
    editionId: edition.id,
    editionName: `${edition.name} (${edition.year})`,
    editionLocation: edition.location,
    eventDate,
    badgeBackgroundColor: edition.badgeBackgroundColor,
    number: application.participation.badgeNumber,
    awardedAt: application.participation.createdAt,
  };
}

/**
 * Retrouve la candidature (et son badge) d'un participant à partir de son numéro de
 * téléphone d'inscription — pour les personnes ayant perdu leur badge après l'inscription
 * (aucun compte n'étant requis, l'email seul ne suffit pas toujours à s'authentifier).
 * En cas d'inscriptions multiples avec le même numéro, la plus récente est retenue.
 */
export async function findParticipantBadgeByPhoneAction(phone: string) {
  const normalized = phone.trim();
  if (!normalized) {
    throw new Error("Merci de renseigner votre numéro de téléphone");
  }

  const application = await db.eventApplication.findFirst({
    where: { phone: normalized, participation: { badgeNumber: { not: null } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!application) {
    throw new Error("Aucun badge trouvé pour ce numéro de téléphone");
  }
  return application;
}

/** Génère le badge PDF (A6) du participant pour un téléchargement immédiat après l'inscription. */
export async function downloadParticipantBadgeAction(applicationId: string) {
  const data = await getParticipantBadgeAction(applicationId);

  const pdf = await generateBadgePdf({
    editionId: data.editionId,
    label: "Participant JNJL",
    fullName: data.fullName,
    region: data.region,
    editionName: data.editionName,
    editionLocation: data.editionLocation,
    eventDate: data.eventDate,
    backgroundColor: data.badgeBackgroundColor,
    number: data.number,
    awardedAt: data.awardedAt,
    logo: await loadPublicImage("jnjl.jpg"),
    partnerLogos: await Promise.all(PARTNER_LOGO_PATHS.map(loadPublicImage)),
  });

  return {
    filename: `badge-${data.number}.pdf`,
    base64: Buffer.from(pdf).toString("base64"),
  };
}
