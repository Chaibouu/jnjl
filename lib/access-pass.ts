import { db } from "@/lib/db";
import { isScanHubEnabled, registerBadgeQr, setBadgeQrActive } from "@/lib/scanhub";

import { categoryLabel } from "@/lib/access-categories";

/** Numéro de badge suivant pour l'édition : ACC-2026-0001, ACC-2026-0002… */
export async function nextAccessNumber(editionId: string, editionYear: number): Promise<string> {
  const count = await db.accessPass.count({ where: { editionId } });
  return `ACC-${editionYear}-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Crée le QR ScanHub d'un badge d'accès (s'il n'existe pas encore) et l'active ou le désactive.
 * Ne lève jamais : retourne `false` si ScanHub est injoignable (à rejouer depuis la page Accès).
 */
export async function syncAccessPassQr(passId: string, active: boolean): Promise<boolean> {
  return (await syncAccessPassQrDetailed(passId, active)).ok;
}

/** Comme syncAccessPassQr, avec la raison de l'échec (affichée dans la page Accès). */
export async function syncAccessPassQrDetailed(
  passId: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!isScanHubEnabled()) {
    return { ok: false, error: "ScanHub n'est pas configuré (SCANHUB_URL / SCANHUB_API_KEY manquants)" };
  }
  try {
    const pass = await db.accessPass.findUnique({ where: { id: passId } });
    if (!pass) return { ok: false, error: "Badge introuvable" };

    const registered = pass.qrCode !== null && pass.qrCode !== pass.number;
    if (!registered) {
      const qr = await registerBadgeQr({
        number: pass.number,
        holderName: pass.fullName,
        holderEmail: pass.email,
        role: categoryLabel(pass.category),
        metadata: { kind: "access", category: pass.category, organization: pass.organization ?? undefined },
      });
      if (!qr.token) throw new Error("ScanHub n'a pas renvoyé le jeton du QR");
      await db.accessPass.update({ where: { id: pass.id }, data: { qrCode: qr.token } });
    }
    await setBadgeQrActive(pass.number, active);
    return { ok: true };
  } catch (error) {
    console.error("ScanHub : synchronisation du QR d'accès en échec", error);
    return { ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}
