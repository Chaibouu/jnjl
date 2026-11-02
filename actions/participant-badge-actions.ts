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

/**
 * Retrouve l'inscription d'un participant qui a perdu son badge : numéro de téléphone d'inscription ET nom de famille.
 * Le nom saisi doit contenir tous les mots du nom de famille enregistré (un simple prénom courant ne suffit pas).
 * Le numéro est comparé sur ses 8 derniers chiffres. Le message d'échec est identique dans tous les cas.
 */
export async function findParticipantBadgeByPhoneAction(
  phone: string,
  lastName: string
): Promise<Result<{ id: string; firstName: string; lastName: string }>> {
  // Au plus 10 essais par quart d'heure et par adresse IP : empêche de deviner un couple téléphone / nom.
  if (await rateLimitRedis(`badge-recover:${await clientIp()}`, { windowMs: 15 * 60 * 1000, max: 10 })) {
    return { ok: false, error: "Trop d'essais : réessayez dans quelques minutes" };
  }

  const key = phoneKey(phone);
  const typed = nameWords(lastName);
  if (!key || typed.length === 0) {
    return { ok: false, error: "Merci de renseigner votre numéro de téléphone et votre nom" };
  }

  const edition = await db.edition.findFirst({
    where: { status: EditionStatus.ACTIVE, isDeleted: false },
    orderBy: { year: "desc" },
    select: { id: true },
  });
  const application = edition
    ? await db.eventApplication.findFirst({
        where: { editionId: edition.id, phoneKey: key, cancelledAt: null, participation: { badgeNumber: { not: null } } },
        select: { id: true, firstName: true, lastName: true },
      })
    : null;

  const registered = application ? nameWords(application.lastName) : [];
  if (!application || registered.length === 0 || !registered.every(word => typed.includes(word))) {
    return { ok: false, error: "Aucun badge trouvé : vérifiez le numéro et le nom saisis lors de votre inscription" };
  }
  return { ok: true, id: application.id, firstName: application.firstName, lastName: application.lastName };
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
