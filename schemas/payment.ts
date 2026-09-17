import { z } from "zod";

/**
 * §9.2 — Paiement manuel : le point focal régional saisit le paiement reçu en
 * espèces et le valide dans la foulée. Le montant est fixé (Règle 8, 5 000 FCFA)
 * mais reste modifiable ici au cas où un tarif dérogatoire serait décidé.
 */
export const recordManualPaymentSchema = z.object({
  amount: z.coerce.number().int().min(1, "Le montant doit être positif"),
  reference: z.string().trim().max(100).optional().or(z.literal("")),
});

export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;
