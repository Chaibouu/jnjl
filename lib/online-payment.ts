import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { getPaymentLinkState } from "@/lib/ipay";
import { createValidatedPayment } from "@/lib/payment-settlement";
import { hasNoRequiredTraining } from "@/lib/training-progress";

export type AttemptOutcome = "succeeded" | "failed" | "expired" | "pending" | "unknown" | "mismatch";

/**
 * Confirme une tentative de paiement en ligne en interrogeant i-pay (source de vérité) :
 * jamais sur la foi du navigateur ni du seul contenu d'un webhook. Idempotent — webhook,
 * rattrapage automatique et bouton de vérification peuvent l'appeler en même temps sans
 * jamais créer deux paiements.
 */
export async function confirmPaymentAttempt(reference: string): Promise<AttemptOutcome> {
  const attempt = await db.paymentAttempt.findUnique({
    where: { reference },
    include: { ambassadorApplication: { select: { id: true, userId: true, editionId: true } } },
  });
  if (!attempt) return "unknown";
  if (attempt.status === "SUCCEEDED") return "succeeded";
  if (attempt.status === "MISMATCH") return "mismatch";

  const link = await getPaymentLinkState(reference);
  if (!link) return "pending"; // prestataire injoignable : on réessaiera au prochain passage

  if (link.state === "pending") {
    if (attempt.status === "INITIATED" && attempt.expiresAt.getTime() < Date.now() - 5 * 60 * 1000) {
      await db.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "INITIATED" },
        data: { status: "EXPIRED", resolvedAt: new Date() },
      });
      return "expired";
    }
    return "pending";
  }

  if (link.state === "expired" || link.state === "failed") {
    if (attempt.status === "INITIATED") {
      await db.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "INITIATED" },
        data: { status: link.state === "failed" ? "FAILED" : "EXPIRED", resolvedAt: new Date() },
      });
    }
    return link.state;
  }

  // Succès chez i-pay : le montant doit correspondre exactement à celui demandé.
  if (link.amount !== attempt.amount) {
    await db.paymentAttempt.updateMany({
      where: { id: attempt.id, status: { in: ["INITIATED", "EXPIRED", "FAILED"] } },
      data: {
        status: "MISMATCH",
        resolvedAt: new Date(),
        providerTransactionId: link.transactionId,
        payerMsisdn: link.msisdn,
        note: `Montant reçu ${link.amount} différent du montant attendu ${attempt.amount}`,
      },
    });
    return "mismatch";
  }

  const { ambassadorApplication: application } = attempt;
  const skipTraining = await hasNoRequiredTraining(application.editionId);

  const settled = await db.$transaction(async transaction => {
    // Prise en charge atomique : un seul appelant peut faire passer la tentative à SUCCEEDED.
    const claimed = await transaction.paymentAttempt.updateMany({
      where: { id: attempt.id, status: { in: ["INITIATED", "EXPIRED", "FAILED"] } },
      data: {
        status: "SUCCEEDED",
        resolvedAt: new Date(),
        providerTransactionId: link.transactionId,
        payerMsisdn: link.msisdn,
      },
    });
    if (claimed.count === 0) return "already" as const;

    const existing = await transaction.payment.findUnique({
      where: { ambassadorApplicationId: application.id },
      select: { id: true },
    });
    if (existing) {
      // Déjà payé autrement : cet argent est en trop et doit être remboursé.
      await transaction.paymentAttempt.update({
        where: { id: attempt.id },
        data: { duplicate: true, note: "Paiement en double : à rembourser" },
      });
      return "duplicate" as const;
    }

    await createValidatedPayment(transaction, {
      applicationId: application.id,
      userId: application.userId,
      skipTraining,
      amount: attempt.amount,
      method: "ONLINE",
      provider: "ipay",
      reference: link.transactionId ?? attempt.reference,
      validatedById: null,
    });
    return "paid" as const;
  });

  if (settled === "paid") {
    await notify({
      userId: application.userId,
      title: "Paiement confirmé",
      message: "Votre paiement en ligne a bien été reçu. Vous pouvez poursuivre votre parcours.",
      link: "/ambassadeur/formation",
    });
  }
  return "succeeded";
}

/** Revérifie toutes les tentatives en cours (et celles clôturées depuis moins de 24 h, au cas où). */
export async function reconcilePendingPayments(applicationId?: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const attempts = await db.paymentAttempt.findMany({
    where: {
      ...(applicationId ? { ambassadorApplicationId: applicationId } : {}),
      OR: [
        { status: "INITIATED" },
        { status: { in: ["EXPIRED", "FAILED"] }, createdAt: { gte: since } },
      ],
    },
    select: { reference: true },
    take: 200,
  });
  const results: Record<string, number> = {};
  for (const { reference } of attempts) {
    const outcome = await confirmPaymentAttempt(reference);
    results[outcome] = (results[outcome] ?? 0) + 1;
  }
  return { checked: attempts.length, results };
}
