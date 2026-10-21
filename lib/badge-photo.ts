import sharp from "sharp";
import { loadPublicImage } from "@/lib/badge-assets";

/**
 * Photo de profil prête à être posée sur un badge : lue depuis le stockage (R2) ou les fichiers publics,
 * recadrée au carré et convertie en JPEG. Les formats que pdf-lib ne sait pas lire (WebP, GIF…) sont ainsi
 * acceptés. Retourne `null` si la photo est absente ou illisible : le badge reste valide, avec les initiales.
 */
export async function loadBadgePhoto(url: string | null | undefined): Promise<Uint8Array | null> {
  const source = url?.trim();
  if (!source) return null;

  try {
    let bytes: Uint8Array | null;
    if (/^https?:\/\//i.test(source)) {
      const response = await fetch(source);
      bytes = response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
    } else {
      bytes = await loadPublicImage(source.replace(/^\/+/, ""));
    }
    if (!bytes) return null;

    const converted = await sharp(bytes)
      .rotate() // respecte l'orientation EXIF des photos de téléphone
      .resize(600, 600, { fit: "cover", position: "attention" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 88 })
      .toBuffer();
    return new Uint8Array(converted);
  } catch {
    return null;
  }
}
