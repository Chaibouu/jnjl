import { db } from "@/lib/db";

export const PAYMENT_REQUIRED_MESSAGE =
  "Cette étape sera disponible après le paiement de vos frais d'inscription.";

/**
 * Tant que l'ambassadeur n'a pas payé (étape PAIEMENT, aucun paiement validé), seules les pages
 * Dashboard, Notifications, Profil et Paiement lui sont accessibles. L'étape fait foi : une
 * candidature déjà avancée dans le parcours n'est jamais bloquée a posteriori.
 */
export async function isPaymentPending(application: { id: string; stage: string }): Promise<boolean> {
  if (application.stage !== "PAIEMENT" && application.stage !== "CANDIDATURE") return false;
  const payment = await db.payment.findFirst({
    where: { ambassadorApplicationId: application.id, status: "VALIDE" },
    select: { id: true },
  });
  return !payment;
}

export async function assertApplicationPaid(application: { id: string; stage: string }) {
  if (await isPaymentPending(application)) throw new Error(PAYMENT_REQUIRED_MESSAGE);
}
