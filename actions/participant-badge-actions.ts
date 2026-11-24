"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { EditionStatus } from "@prisma/client";
import { buildParticipantBadgePdf } from "@/lib/participant-badge-pdf";
import { nameKey, phoneKey } from "@/lib/phone";
import { rateLimitRedis } from "@/lib/rateLimit-redis";

/**
 * Badges des participants (inscription publique, sans compte). Les actions renvoient `{ ok:false, error }` au lieu de
 * lever : en production, Next masque le message d'une erreur levée et le visiteur ne verrait qu'un texte générique.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function clientIp() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "inconnue";
}

/** Mots d'un nom, sans accents ni casse ; un nom sans lettres latines (arabe…) est comparé tel quel. */
function nameWords(value: string): string[] {
  const key = nameKey(value);
  return (key || value.trim().toLowerCase()).split(/\s+/).filter(Boolean);
}

export type ParticipantBadgeView = {
  id: string;
  firstName: string;
  lastName: string;
  region: string;
  badgeNumber: string;
  /** Contenu du QR imprimé sur le badge (jeton ScanHub, ou numéro du badge à défaut). */
  qrValue: string;
  photoUrl: string | null;
};

/**
 * Page publique « Mon badge » : retrouve l'inscription à partir du numéro de téléphone OU du numéro de badge
 * (JNJL-2026-PART-0042) ET du nom de famille, pour afficher le badge et permettre d'ajuster la photo.
 * Mêmes protections que la récupération du badge : limite d'essais par IP, nom de famille complet, message d'échec unique.
 */
export async function findParticipantBadgeAction(query: string, lastName: string): Promise<Result<ParticipantBadgeView>> {
  if (await rateLimitRedis(`badge-recover:${await clientIp()}`, { windowMs: 15 * 60 * 1000, max: 10 })) {
    return { ok: false, error: "Trop d'essais : réessayez dans quelques minutes" };
  }

  const reference = query.trim();
  const isBadgeNumber = /^JNJL-\d{4}-PART-\d+$/i.test(reference);
  const key = isBadgeNumber ? null : phoneKey(reference);
  const typed = nameWords(lastName);
  if ((!isBadgeNumber && !key) || typed.length === 0) {
    return { ok: false, error: "Merci de renseigner votre numéro (téléphone ou badge) et votre nom de famille" };
  }

  const edition = await db.edition.findFirst({
    where: { status: EditionStatus.ACTIVE, isDeleted: false },
    orderBy: { year: "desc" },
    select: { id: true },
  });
  const application = edition
    ? await db.eventApplication.findFirst({
        where: {
          editionId: edition.id,
          cancelledAt: null,
          ...(isBadgeNumber
            ? { participation: { badgeNumber: { equals: reference, mode: "insensitive" } } }
            : { phoneKey: key, participation: { badgeNumber: { not: null } } }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          region: { select: { name: true } },
          participation: { select: { badgeNumber: true, qrCode: true } },
        },
      })
    : null;

  const registered = application ? nameWords(application.lastName) : [];
  if (
    !application?.participation?.badgeNumber ||
    registered.length === 0 ||
    !registered.every(word => typed.includes(word))
  ) {
    return { ok: false, error: "Aucun badge trouvé : vérifiez le numéro et le nom saisis lors de votre inscription" };
  }
  return {
    ok: true,
    id: application.id,
    firstName: application.firstName,
    lastName: application.lastName,
    region: application.region?.name ?? "Niger",
    badgeNumber: application.participation.badgeNumber,
    qrValue: application.participation.qrCode ?? application.participation.badgeNumber,
    photoUrl: application.photoUrl,
  };
}

/** Génère le badge PDF (A6) du participant pour un téléchargement (après l'inscription, ou depuis le lien reçu). */
export async function downloadParticipantBadgeAction(
  applicationId: string
): Promise<Result<{ filename: string; base64: string }>> {
  // 30 générations par heure et par adresse IP : le PDF est coûteux à produire.
  if (await rateLimitRedis(`badge-download:${await clientIp()}`, { windowMs: 60 * 60 * 1000, max: 30 })) {
    return { ok: false, error: "Trop de téléchargements : réessayez dans quelques minutes" };
  }
  try {
    return { ok: true, ...(await buildParticipantBadgePdf(applicationId)) };
  } catch (error) {
    console.error("Badge participant : génération impossible", error);
    return { ok: false, error: "Badge introuvable ou impossible à générer. Réessayez dans un instant." };
  }
}
