"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import sharp from "sharp";
import { db } from "@/lib/db";
import { rateLimitRedis } from "@/lib/rateLimit-redis";
import { getAppUrl } from "@/lib/app-url";
import { requirePermission } from "@/actions/requirePermission";
import { deleteFile, saveFile, storageKeyFromUrl } from "@/lib/storage";
import { storagePaths } from "@/lib/storage-paths";

/**
 * Photo facultative du participant, affichée sur son badge (sans photo, le badge garde le logo de la JNJL).
 * Le participant n'a pas de compte : l'identifiant (aléatoire) de son inscription fait office de clé, comme pour le
 * téléchargement de son badge. Les actions renvoient `{ ok:false, error }` au lieu de lever, car la production masque
 * les erreurs levées.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Supprime l'ancienne photo si c'est bien un de nos fichiers du dossier des participants. */
async function removeStoredPhoto(url: string | null) {
  if (!url) return;
  const key = storageKeyFromUrl(url);
  if (!key?.startsWith(`${storagePaths.participantPhoto()}/`)) return;
  await deleteFile(url).catch(() => undefined);
}

export async function uploadParticipantPhotoAction(applicationId: string, formData: FormData): Promise<Result<{ photoUrl: string }>> {
  // 20 envois de photo par heure et par adresse IP : empêche de remplir le stockage.
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "inconnue";
  if (await rateLimitRedis(`participant-photo:${ip}`, { windowMs: 60 * 60 * 1000, max: 20 })) {
    return { ok: false, error: "Trop d'envois : réessayez plus tard" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Aucun fichier fourni" };
  if (file.size > MAX_BYTES) return { ok: false, error: "Photo trop volumineuse (4 Mo maximum)" };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: "Format non supporté : utilisez une image JPEG, PNG ou WebP" };

  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, photoUrl: true, cancelledAt: true },
  });
  if (!application || application.cancelledAt) return { ok: false, error: "Inscription introuvable" };

  // La photo est décodée et ré-encodée : un fichier qui n'est pas une vraie image est refusé et les métadonnées
  // (EXIF, position GPS) sont retirées.
  let output: Buffer;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 });
    const { format } = await image.metadata();
    if (format !== "jpeg" && format !== "png" && format !== "webp") throw new Error("format");
    output = await image
      .rotate()
      .resize(800, 800, { fit: "cover", position: "attention" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 86 })
      .toBuffer();
  } catch {
    return { ok: false, error: "Cette image est illisible ou invalide" };
  }

  let photoUrl: string;
  try {
    photoUrl = await saveFile({
      folder: storagePaths.participantPhoto(),
      filename: `${randomUUID()}.jpg`,
      body: new Uint8Array(output),
      contentType: "image/jpeg",
    });
  } catch (error) {
    console.error("Photo participant : stockage indisponible", error);
    return { ok: false, error: "Stockage indisponible, réessayez plus tard" };
  }
  try {
    await db.eventApplication.update({ where: { id: applicationId }, data: { photoUrl } });
  } catch (error) {
    // Fichier déjà écrit mais fiche non mise à jour : on retire l'orphelin.
    console.error("Photo participant : enregistrement impossible", error);
    await removeStoredPhoto(photoUrl);
    return { ok: false, error: "Enregistrement impossible, réessayez plus tard" };
  }
  await removeStoredPhoto(application.photoUrl);
  revalidatePath("/participer/badge/" + applicationId);
  return { ok: true, photoUrl };
}

/**
 * Renvoie la photo enregistrée (en base64) pour la rouvrir dans l'outil de cadrage : le navigateur ne peut pas toujours
 * relire directement un fichier hébergé sur un autre domaine (stockage R2).
 */
export async function loadParticipantPhotoAction(applicationId: string): Promise<Result<{ base64: string; mime: string }>> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "inconnue";
  if (await rateLimitRedis(`participant-photo-read:${ip}`, { windowMs: 60 * 60 * 1000, max: 60 })) {
    return { ok: false, error: "Trop de demandes : réessayez plus tard" };
  }

  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    select: { photoUrl: true, cancelledAt: true },
  });
  if (!application || application.cancelledAt || !application.photoUrl) return { ok: false, error: "Aucune photo enregistrée" };

  try {
    const url = application.photoUrl.startsWith("http") ? application.photoUrl : `${getAppUrl()}${application.photoUrl}`;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(String(response.status));
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new Error("trop volumineuse");
    return { ok: true, base64: bytes.toString("base64"), mime: response.headers.get("content-type") ?? "image/jpeg" };
  } catch (error) {
    console.error("Photo participant : lecture impossible", error);
    return { ok: false, error: "Impossible de rouvrir la photo actuelle : choisissez-la de nouveau avec « Changer la photo »." };
  }
}

/** Retire la photo : le badge reprend le logo de la JNJL. */
export async function removeParticipantPhotoAction(applicationId: string): Promise<Result> {
  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    select: { photoUrl: true, cancelledAt: true },
  });
  if (!application || application.cancelledAt) return { ok: false, error: "Inscription introuvable" };
  await db.eventApplication.update({ where: { id: applicationId }, data: { photoUrl: null } });
  await removeStoredPhoto(application.photoUrl);
  revalidatePath("/participer/badge/" + applicationId);
  return { ok: true };
}

/** Retrait d'une photo inappropriée par l'administration (la fiche et le reste des informations sont conservés). */
export async function removeParticipantPhotoAdminAction(applicationId: string): Promise<Result> {
  const actor = await requirePermission("applications.event.manage");
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") return { ok: false, error: "Réservé aux administrateurs" };
  const result = await removeParticipantPhotoAction(applicationId);
  revalidatePath("/admin/candidatures/participants");
  return result;
}
