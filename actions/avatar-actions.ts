"use server";

import { randomUUID } from "crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { AVATAR_UPLOAD, isPresetAvatar } from "@/lib/avatars";
import { deleteFile, saveFile, storageKeyFromUrl } from "@/lib/storage";
import { storagePaths } from "@/lib/storage-paths";

async function getConnectedUserId() {
  const result = await getUser();
  const userId = result?.user?.user?.id;
  if (!userId) throw new Error("Authentification requise");
  return userId;
}

/** Supprime l'ancienne photo téléversée par l'utilisateur (jamais un avatar prédéfini ni un fichier d'un autre dossier). */
async function removePreviousUpload(userId: string, previousUrl: string | null) {
  if (!previousUrl) return;
  const key = storageKeyFromUrl(previousUrl);
  if (!key?.startsWith(`${storagePaths.avatar(userId)}/`)) return;
  await deleteFile(previousUrl).catch(() => undefined);
}

async function updateImage(userId: string, image: string | null) {
  const previous = await db.user.findUnique({ where: { id: userId }, select: { image: true } });
  await db.user.update({ where: { id: userId }, data: { image } });
  if (previous?.image !== image) await removePreviousUpload(userId, previous?.image ?? null);
  return { image };
}

/** Choisit un avatar prédéfini (liste fermée, définie dans lib/avatars.ts). */
export async function setPresetAvatarAction(avatar: string) {
  const userId = await getConnectedUserId();
  if (!isPresetAvatar(avatar)) throw new Error("Avatar invalide");
  return updateImage(userId, avatar);
}

/** Retire l'avatar : le visuel par défaut est affiché. */
export async function removeAvatarAction() {
  const userId = await getConnectedUserId();
  return updateImage(userId, null);
}

/**
 * Téléverse une photo personnelle. Le fichier est décodé et ré-encodé par sharp :
 * un contenu qui n'est pas une vraie image est refusé, les métadonnées (EXIF, GPS) sont retirées,
 * et le résultat est un carré WebP de taille fixe.
 */
export async function uploadAvatarAction(formData: FormData) {
  const userId = await getConnectedUserId();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Aucun fichier fourni");
  if (file.size > AVATAR_UPLOAD.maxBytes) {
    throw new Error(`Image trop volumineuse (max ${AVATAR_UPLOAD.maxBytes / 1024 / 1024} Mo)`);
  }
  if (!AVATAR_UPLOAD.allowedTypes.includes(file.type)) {
    throw new Error("Format non supporté : utilisez une image JPEG, PNG ou WebP");
  }

  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000 });
    const { format } = await image.metadata();
    if (format !== "jpeg" && format !== "png" && format !== "webp") throw new Error("format");
    output = await image
      .rotate() // applique l'orientation EXIF avant de retirer les métadonnées
      .resize(AVATAR_UPLOAD.outputSize, AVATAR_UPLOAD.outputSize, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error("Cette image est illisible ou invalide");
  }

  const url = await saveFile({
    folder: storagePaths.avatar(userId),
    filename: `${randomUUID()}.webp`,
    body: new Uint8Array(output),
    contentType: "image/webp",
  });

  return updateImage(userId, url);
}
