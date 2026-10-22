"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Undo2 } from "lucide-react";
import {
  cancelPaymentAction,
  withdrawAmbassadorApplicationAction,
  type CancelResult,
} from "@/actions/payment-cancellation-actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";

/** Super Admin : annuler un paiement (retour à l'étape « Paiement ») ou enregistrer le désistement du candidat. */
export function PaymentCancellationPanel({
  applicationId,
  candidateName,
  hasPayment,
}: {
  applicationId: string;
  candidateName: string;
  hasPayment: boolean;
}) {
  const router = useRouter();
  const { prompt } = useConfirm();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const describe = (result: Extract<CancelResult, { ok: true }>) =>
    result.refundDue
      ? `${result.message} À rembourser au candidat : ${result.refundDue.amount.toLocaleString("fr-FR")} FCFA` +
        `${result.refundDue.reference ? ` (référence ${result.refundDue.reference})` : ""}. ` +
        "La plateforme ne rend pas l'argent : le remboursement se fait hors plateforme."
      : result.message;

  const run = async (kind: "payment" | "withdraw") => {
    const reason = await prompt({
      title: kind === "payment" ? "Annuler ce paiement ?" : "Enregistrer le désistement ?",
      description:
        kind === "payment"
          ? `${candidateName} reviendra à l'étape « Paiement » (candidature acceptée, non payée). Son reçu sera supprimé et le montant est à lui rembourser.`
          : `La candidature de ${candidateName} sera annulée (non retenue, motif « Désistement »). Son paiement éventuel est retiré et le montant est à lui rembourser.`,
      label: "Motif (facultatif)",
      defaultValue: kind === "payment" ? "Annulation à la demande du candidat" : "Désistement à la demande du candidat",
      confirmLabel: kind === "payment" ? "Annuler le paiement" : "Enregistrer le désistement",
      variant: "destructive",
    });
    if (reason === null) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result =
          kind === "payment"
            ? await cancelPaymentAction(applicationId, reason)
            : await withdrawAmbassadorApplicationAction(applicationId, reason);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessage(describe(result));
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Super Admin</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {hasPayment && (
          <Button
            type="button"
            variant="outline"
            loading={isPending}
            onClick={() => run("payment")}
            className="gap-2 rounded-none"
          >
            <Undo2 className="h-4 w-4" />
            Annuler le paiement
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          loading={isPending}
          onClick={() => run("withdraw")}
          className="gap-2 rounded-none border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Ban className="h-4 w-4" />
          Désistement du candidat
        </Button>
      </div>
      {message && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
