"use server";

import { getUser } from "@/actions/getUser";
import { ForbiddenError } from "@/lib/forbidden-error";
import { hasAnyPermission } from "@/lib/permissions";
import { uploadFile } from "@/lib/upload";
import { storagePaths } from "@/lib/storage-paths";
import type { User } from "@/types/user";

/** Permissions qui donnent accès à l'éditeur de contenu riche. */
const EDITOR_PERMISSIONS = ["training.manage", "news.manage", "program.manage"];

/**
 * Téléverse une image insérée depuis l'éditeur riche.
 * Le contenu du fichier est vérifié (signature binaire), le nom est remplacé par un identifiant aléatoire.
 */
export async function uploadEditorImageAction(formData: FormData) {
  const session = await getUser();
  const user = session?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  if (!hasAnyPermission(user, EDITOR_PERMISSIONS)) {
    throw new ForbiddenError("Permission requise pour téléverser une image");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun fichier fourni");
  }

  const uploaded = await uploadFile(file, {
    maxSize: 4 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    destination: storagePaths.editorImage(),
  });

  return { url: uploaded.path };
}
