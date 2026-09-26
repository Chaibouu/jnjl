"use server";

import { requirePermission } from "@/actions/requirePermission";
import { uploadFile } from "@/lib/upload";
import { storagePaths } from "@/lib/storage-paths";

/**
 * Téléversement des médias du site public (partenaires, actualités, intervenants, galerie).
 * Un seul point d'entrée générique : chaque "kind" porte sa propre permission et son dossier
 * de stockage (Cloudflare R2 en production, `public/uploads/` en local — voir lib/storage.ts).
 */
const MEDIA_KINDS = {
  partnerLogo: { permission: "partners.manage", folder: () => storagePaths.partnerLogo() },
  newsCover: { permission: "news.manage", folder: () => storagePaths.newsCover() },
  speakerPhoto: { permission: "speakers.manage", folder: () => storagePaths.speakerPhoto() },
  galleryPhoto: { permission: "media.manage", folder: () => storagePaths.gallery(new Date().getFullYear()) },
} as const;

export type SiteMediaKind = keyof typeof MEDIA_KINDS;

export async function uploadSiteMediaAction(formData: FormData) {
  const kind = formData.get("kind");
  if (typeof kind !== "string" || !(kind in MEDIA_KINDS)) {
    throw new Error("Type de média invalide");
  }
  const config = MEDIA_KINDS[kind as SiteMediaKind];
  await requirePermission(config.permission);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun fichier fourni");
  }

  const uploaded = await uploadFile(file, {
    maxSize: 4 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    destination: config.folder(),
  });

  return { url: uploaded.path };
}
