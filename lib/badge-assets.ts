import { readFile } from "fs/promises";
import { join } from "path";
import { getAppUrl } from "@/lib/app-url";

/** Image publique lue sur le disque, ou récupérée depuis le site si le fichier n'est pas accessible. */
export async function loadPublicImage(relativePath: string): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await readFile(join(process.cwd(), "public", relativePath)));
  } catch {
    try {
      const response = await fetch(`${getAppUrl()}/${relativePath}`);
      if (response.ok) return new Uint8Array(await response.arrayBuffer());
    } catch {
      // Sans l'image, le badge est quand même généré.
    }
  }
  return null;
}

export const PARTNER_LOGO_PATHS = [
  "partenaires/armoirie.png",
  "partenaires/ANSI.png",
  "partenaires/Cabinet-Leader-dAfrique.png",
];
