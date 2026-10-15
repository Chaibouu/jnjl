import { db } from "@/lib/db";
import { isScanHubEnabled, registerBadgeQr, setBadgeQrActive } from "@/lib/scanhub";

/**
 * Aligne le QR ScanHub d'un badge : le crée s'il n'existe pas encore (le jeton aléatoire de ScanHub
 * remplace alors le numéro dans `qrCode`), puis l'active ou le désactive. Un QR n'est actif qu'une fois
 * l'embarquement validé : à l'entrée, l'agent voit le badge refusé tant que le point focal n'a pas validé.
 *
 * Ne lève jamais : l'attribution du badge et l'embarquement ne doivent pas dépendre de ScanHub.
 * Retourne `false` si la synchronisation a échoué (à rejouer depuis l'écran Badges).
 */
export async function syncBadgeQr(userBadgeId: string, active: boolean): Promise<boolean> {
  if (!isScanHubEnabled()) return true;

  try {
    const userBadge = await db.userBadge.findUnique({
      where: { id: userBadgeId },
      select: {
        id: true,
        number: true,
        qrCode: true,
        user: { select: { name: true, email: true } },
        badge: { select: { label: true } },
      },
    });
    if (!userBadge?.number) return false;

    // Un QR déjà remplacé par un jeton ScanHub n'a plus de copie à créer.
    const alreadyRegistered = userBadge.qrCode !== null && userBadge.qrCode !== userBadge.number;
    if (!alreadyRegistered) {
      const qr = await registerBadgeQr({
        number: userBadge.number,
        holderName: userBadge.user.name ?? userBadge.number,
        holderEmail: userBadge.user.email,
        role: userBadge.badge.label,
      });
      if (!qr.token) {
        throw new Error("ScanHub n'a pas renvoyé le jeton du QR");
      }
      await db.userBadge.update({ where: { id: userBadge.id }, data: { qrCode: qr.token } });
    }

    await setBadgeQrActive(userBadge.number, active);
    return true;
  } catch (error) {
    console.error("ScanHub : synchronisation du QR du badge en échec", error);
    return false;
  }
}
