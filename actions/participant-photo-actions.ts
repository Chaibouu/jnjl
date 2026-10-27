"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import sharp from "sharp";
import { db } from "@/lib/db";
import { rateLimitRedis } from "@/lib/rateLimit-redis";
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

  const photoUrl = await saveFile({
    folder: storagePaths.participantPhoto(),
    filename: `${randomUUID()}.jpg`,
    body: new Uint8Array(output),
    contentType: "image/jpeg",
  });
  await db.eventApplication.update({ where: { id: applicationId }, data: { photoUrl } });
  await removeStoredPhoto(application.photoUrl);
  revalidatePath("/participer/badge/" + applicationId);
  return { ok: true, photoUrl };
}

/** Retire la photo : le badge reprend le logo de la JNJL. */
export async function removeParticipantPhotoAction(applicationId: string): Promise<Result> {
  const application = await db.eventApplication.findUnique({ where: { id: applicationId }, select: { photoUrl: true } });
  if (!application) return { ok: false, error: "Inscription introuvable" };
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
