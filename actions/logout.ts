"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * La suppression des cookies ne doit jamais dépendre du nettoyage en base :
 * l'ancienne implémentation appelait /api/auth/logout via un fetch du serveur
 * vers lui-même, et la moindre erreur sur cet appel (réseau, timeout…) empêchait
 * l'effacement des cookies — l'accessToken (JWT stateless, non vérifié en base)
 * restait alors valide jusqu'à son expiration et l'utilisateur restait connecté.
 */
export const logout = async () => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  try {
    if (refreshToken) {
      await db.session.deleteMany({
        where: { refreshToken: hashRefreshToken(refreshToken) },
      });
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la session :", error);
  }

  cookieStore.set("accessToken", "", { maxAge: -1, path: "/" });
  cookieStore.set("refreshToken", "", { maxAge: -1, path: "/" });

  return { success: "Déconnexion réussie" };
};
