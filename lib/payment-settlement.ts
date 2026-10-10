import type { Prisma } from "@prisma/client";

/**
 * Enregistre un paiement validé pour une candidature : paiement + reçu, puis passage à l'étape
 * FORMATION (obligatoire : validée par le staff de la région ou par les modules en ligne).
 * Commun au paiement en ligne et au paiement manuel exceptionnel.
 */
export async function createValidatedPayment(
  transaction: Prisma.TransactionClient,
  params: {
    applicationId: string;
    userId: string | null;
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
    data: { stage: "FORMATION" },
  });

  return payment;
}
