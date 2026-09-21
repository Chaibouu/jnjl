import { NextRequest, NextResponse } from "next/server";
import { uploadFromFormData, validateFile } from "@/lib/upload";
import { AuthenticationError, AuthorizationError, handleApiError, ValidationError } from "@/lib/errors";
import { getUser } from "@/actions/getUser";
import type { User } from "@/types/user";
import { logger } from "@/lib/logger";
import { storagePaths } from "@/lib/storage-paths";

/**
 * API route pour uploader des fichiers
 * POST /api/upload
 */
export async function POST(req: NextRequest) {
  try {
    // Réservé aux comptes internes : évite qu'un anonyme remplisse le stockage.
    const session = await getUser();
    const user = session?.user?.user as User | undefined;
    if (!user) throw new AuthenticationError("Authentification requise");
    if (!["SUPER_ADMIN", "ADMIN", "STAFF"].includes(user.role)) {
      throw new AuthorizationError("Accès refusé");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new ValidationError("Aucun fichier fourni");
    }

    // Options d'upload (peuvent être personnalisées selon vos besoins)
    const uploadOptions = {
      maxSize: 4 * 1024 * 1024, // 4MB (limite des fonctions Vercel : 4,5MB)
      allowedTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
      ],
      destination: storagePaths.misc(),
    };

    // Valider le fichier
    const validation = validateFile(file, uploadOptions);
    if (!validation.valid) {
      throw new ValidationError(validation.error || "Fichier invalide");
    }

    // Uploader le fichier
    const result = await uploadFromFormData(formData, "file", uploadOptions);

    logger.info({ filename: result.filename, size: result.size, mimetype: result.mimetype }, "File uploaded successfully");

    return NextResponse.json({
      success: true,
      file: {
        filename: result.filename,
        path: result.path,
        size: result.size,
        mimetype: result.mimetype,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "File upload failed");
    return handleApiError(error);
  }
}

// Désactiver le body parsing par défaut pour gérer FormData
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
