import type { Prisma } from "@prisma/client";
import { hasNoRequiredTraining } from "@/lib/training-progress";

/**
 * Enregistre un paiement validé pour une candidature : paiement + reçu, puis passage à l'étape
 * suivante (FORMATION, ou QCM si l'édition n'a aucune formation obligatoire).
 * Commun au paiement en ligne et au paiement manuel exceptionnel.
 */
export async function createValidatedPayment(
  transaction: Prisma.TransactionClient,
  params: {
    applicationId: string;
    userId: string | null;
    skipTraining: boolean;
    amount: number;
    method: "MANUAL" | "ONLINE";
    provider: string;
    reference: string | null;
    validatedById: string | null;
  }
) {
  const payment = await transaction.payment.create({
    data: {
      ambassadorApplicationId: params.applicationId,
      amount: params.amount,
      method: params.method,
      provider: params.provider,
      reference: params.reference,
      status: "VALIDE",
      validatedById: params.validatedById,
      validatedAt: new Date(),
    },
  });

  await transaction.document.create({
    data: {
      type: "PAYMENT_RECEIPT",
      fileUrl: `/admin/paiements/${params.applicationId}/recu`,
      userId: params.userId,
      ambassadorApplicationId: params.applicationId,
      paymentId: payment.id,
    },
  });

  await transaction.ambassadorApplication.update({
    where: { id: params.applicationId },
    data: { stage: params.skipTraining ? "QCM" : "FORMATION" },
  });

  return payment;
}

export { hasNoRequiredTraining };
