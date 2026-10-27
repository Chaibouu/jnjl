"use server";

import { db } from "@/lib/db";
import { generateBadgePdf } from "@/lib/generate-badge-pdf";
import { loadPublicImage, PARTNER_LOGO_PATHS } from "@/lib/badge-assets";
import { headers } from "next/headers";
import { nameKey, phoneKey } from "@/lib/phone";
import { rateLimitRedis } from "@/lib/rateLimit-redis";

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
  if (!application || !application.participation?.badgeNumber || application.cancelledAt) {
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
    qrValue: application.participation.qrCode ?? application.participation.badgeNumber,
    awardedAt: application.participation.createdAt,
  };
}

/**
 * Retrouve la candidature (et son badge) d'un participant qui a perdu son badge : numéro de téléphone d'inscription
 * ET nom de famille (deuxième vérification, pour qu'un tiers qui connaît un numéro ne récupère pas le badge d'un
 * autre). Le numéro est comparé sur ses 8 derniers chiffres : avec ou sans indicatif ni espaces, c'est le même.
 * Le message d'échec est volontairement identique dans tous les cas.
 */
export async function findParticipantBadgeByPhoneAction(phone: string, lastName: string) {
  // Au plus 10 essais par quart d'heure et par adresse IP : empêche de deviner un couple téléphone / nom.
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "inconnue";
  if (await rateLimitRedis(`badge-recover:${ip}`, { windowMs: 15 * 60 * 1000, max: 10 })) {
    throw new Error("Trop d'essais : réessayez dans quelques minutes");
  }

  const key = phoneKey(phone);
  const name = nameKey(lastName);
  if (!key || !name) {
    throw new Error("Merci de renseigner votre numéro de téléphone et votre nom");
  }

  const notFound = new Error("Aucun badge trouvé : vérifiez le numéro et le nom saisis lors de votre inscription");
  const application = await db.eventApplication.findFirst({
    where: { phoneKey: key, cancelledAt: null, participation: { badgeNumber: { not: null } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true },
  });
  // Tous les mots du nom saisi doivent figurer dans le nom de l'inscrit (certains inversent prénom et nom).
  const registeredWords = application ? nameKey(`${application.lastName} ${application.firstName}`).split(" ") : [];
  if (!application || !name.split(" ").every(word => registeredWords.includes(word))) {
    throw notFound;
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
    qrValue: data.qrValue,
    logo: await loadPublicImage("jnjl.jpg"),
    partnerLogos: await Promise.all(PARTNER_LOGO_PATHS.map(loadPublicImage)),
  });

  return {
    filename: `badge-${data.number}.pdf`,
    base64: Buffer.from(pdf).toString("base64"),
  };
}
