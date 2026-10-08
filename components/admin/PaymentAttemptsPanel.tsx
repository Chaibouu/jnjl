"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  listPaymentAttemptsAction,
  recheckPaymentAttemptAction,
} from "@/actions/online-payment-actions";
import { Button } from "@/components/ui/button";

type Attempts = Awaited<ReturnType<typeof listPaymentAttemptsAction>>;

const LABEL: Record<string, string> = {
  INITIATED: "En attente",
  FAILED: "Échoué",
  EXPIRED: "Expiré",
  MISMATCH: "Montant inattendu",
  SUCCEEDED: "Réussi",
};

/** Supervision des paiements en ligne : tout ce qui n'est pas réglé proprement apparaît ici. */
export function PaymentAttemptsPanel({ attempts }: { attempts: Attempts }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (attempts.length === 0) return null;

  const recheck = (id: string) => {
    setMessage("");
    startTransition(async () => {
      try {
        const { outcome } = await recheckPaymentAttemptAction(id);
        setMessage(
          outcome === "succeeded"
            ? "Paiement confirmé chez i-pay : le candidat est maintenant marqué payé."
            : `Statut chez i-pay : ${outcome === "pending" ? "toujours en attente" : outcome}.`
        );
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50/50 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 p-5">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <div>
          <h2 className="text-lg font-semibold">Paiements en ligne à surveiller</h2>
          <p className="text-sm text-muted-foreground">
            Tentatives en attente, échouées ou à examiner. « Revérifier » interroge i-pay et valide
            automatiquement si le paiement a bien abouti.
          </p>
        </div>
      </div>
      {message && <p className="border-b border-amber-200 px-5 py-3 text-sm">{message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <tbody className="divide-y divide-amber-200">
            {attempts.map(attempt => (
              <tr key={attempt.id}>
                <td className="px-5 py-3">
                  <p className="font-medium">
                    {attempt.ambassadorApplication.firstName} {attempt.ambassadorApplication.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.ambassadorApplication.region.name} · {attempt.ambassadorApplication.phone}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium">
                    {attempt.duplicate ? "Doublon à rembourser" : LABEL[attempt.status] ?? attempt.status}
                  </span>
                  {attempt.note && <p className="mt-1 text-xs text-muted-foreground">{attempt.note}</p>}
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {new Date(attempt.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-5 py-3 text-right">
                  {!attempt.duplicate && attempt.status !== "MISMATCH" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => recheck(attempt.id)}
                      className="gap-1.5 rounded-none"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Revérifier
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
