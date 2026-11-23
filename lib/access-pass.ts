import { db } from "@/lib/db";
import { isScanHubEnabled, registerBadgeQr, setBadgeQrActive } from "@/lib/scanhub";

import { categoryLabel } from "@/lib/access-categories";
import type { DesignParams, DesignVariant } from "@/lib/generate-badge-pdf";

/** Numéro de badge suivant pour l'édition : ACC-2026-0001, ACC-2026-0002… */
export const accessCounterKey = (editionId: string) => `badges.access_counter.${editionId}`;

/**
 * Numéro suivant : jamais réutilisé, même après la suppression d'un badge (un numéro réutilisé pointerait vers le QR
 * ScanHub de l'ancien porteur). On part du plus grand numéro présent et du compteur des numéros supprimés.
 */
export async function nextAccessNumber(editionId: string, editionYear: number): Promise<string> {
  const prefix = `ACC-${editionYear}-`;
  const [existing, burned] = await Promise.all([
    db.accessPass.findMany({ where: { number: { startsWith: prefix } }, select: { number: true } }),
    db.setting.findUnique({ where: { key: accessCounterKey(editionId) }, select: { value: true } }),
  ]);
  const highest = existing.reduce((max, item) => Math.max(max, Number(item.number.slice(prefix.length)) || 0), 0);
  const next = Math.max(highest, Number(burned?.value ?? 0)) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
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

/** Maquette officielle de chaque catégorie de badge d'accès. */
export const DESIGN_VARIANT_BY_CATEGORY: Record<string, DesignVariant> = {
  POINT_FOCAL: "generic",
  COMMISSION: "commission",
  INTERVENANT: "speaker",
  MEDIA: "generic",
  COMITE_ORGANISATION: "generic",
  PERSONNEL_APPUI: "generic",
  INVITE: "generic",
  AMBASSADEUR_SPONSOR: "generic",
  ANIMATION: "generic",
  AUTRE: "generic",
};

/** Titre en grand du modèle générique (le modèle « Point focal » sans titre). */
export const GENERIC_TITLES: Record<string, string> = {
  POINT_FOCAL: "Point focal",
  MEDIA: "Média",
  COMITE_ORGANISATION: "Comité d'organisation",
  PERSONNEL_APPUI: "Personnel d'appui",
  INVITE: "Invité",
  AMBASSADEUR_SPONSOR: "Ambassadeur sponsor",
  ANIMATION: "Animation",
  AUTRE: "Accès",
};

/** Paramètres de dessin d'un badge d'accès (hors QR et photo, fournis par l'appelant). */
export function passDesignParams(
  pass: {
    category: string;
    fullName: string;
    organization: string | null;
    jobTitle: string | null;
    number: string;
    createdAt: Date;
  },
  qrValue: string,
  photo: Uint8Array | null
): DesignParams {
  return {
    title: GENERIC_TITLES[pass.category],
    fullName: pass.fullName,
    region:
      pass.organization ??
      (pass.category === "POINT_FOCAL" ? "Niger" : pass.category === "COMMISSION" ? "Commission" : "JNJL 2026"),
    jobTitle: pass.jobTitle,
    photo,
    number: pass.number,
    qrValue,
    awardedAt: pass.createdAt,
  };
}
