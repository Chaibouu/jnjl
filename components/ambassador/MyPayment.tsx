"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Clock, CreditCard, RefreshCw } from "lucide-react";
import {
  getMyPaymentStateAction,
  refreshMyPaymentAction,
  startOnlinePaymentAction,
} from "@/actions/online-payment-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

type State = Awaited<ReturnType<typeof getMyPaymentStateAction>>;

export function MyPayment({
  initialState,
  returning,
  failed,
}: {
  initialState: State;
  returning: boolean;
  failed: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isPending, startTransition] = useTransition();
  const polls = useRef(0);

  // Au retour de la page de paiement, on attend la confirmation du serveur (jusqu'à ~2 min).
  useEffect(() => {
    if (!returning || state?.paid) return;
    const timer = setInterval(async () => {
      polls.current += 1;
      try {
        await refreshMyPaymentAction();
        const next = await getMyPaymentStateAction();
        setState(next);
        if (next?.paid || polls.current >= 24) clearInterval(timer);
      } catch {
        clearInterval(timer);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [returning, state?.paid]);

  const pay = () => {
    setError("");
    startTransition(async () => {
      try {
        const { pageUrl } = await startOnlinePaymentAction();
        window.location.href = pageUrl;
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const refresh = () => {
    setError("");
    setInfo("");
    startTransition(async () => {
      try {
        const result = await refreshMyPaymentAction();
        setState(await getMyPaymentStateAction());
        setInfo(
          result.paid
            ? "Votre paiement est confirmé."
            : "Aucun paiement confirmé pour le moment. Si vous venez de payer, patientez une minute puis réessayez."
        );
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  if (!state) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Aucune candidature ambassadeur n&apos;est associée à votre compte pour l&apos;édition en cours.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Parcours ambassadeur
        </p>
        <h1 className="mt-1 text-2xl font-bold">Frais d&apos;inscription</h1>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {state.paid ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <h2 className="mt-3 text-lg font-bold">Paiement confirmé</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {state.paid.amount.toLocaleString("fr-FR")} FCFA
              {state.paid.validatedAt
                ? ` — le ${new Date(state.paid.validatedAt).toLocaleDateString("fr-FR")}`
                : ""}
            </p>
            <p className="mt-3 text-sm">Vous pouvez poursuivre votre parcours.</p>
          </div>
        ) : !state.accepted ? (
          <p className="text-center text-sm text-muted-foreground">
            Votre candidature doit d&apos;abord être acceptée avant de pouvoir payer.
          </p>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Montant à régler</p>
            <p className="mt-1 text-4xl font-bold" style={{ color: charter.orange }}>
              {state.amount.toLocaleString("fr-FR")} FCFA
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Paiement sécurisé par i-pay : Airtel Money, Moov Money, Zamani ou carte.
            </p>

            {failed && (
              <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Le paiement n&apos;a pas abouti. Vous pouvez réessayer.
              </p>
            )}
            {(returning || state.pending) && (
              <p className="mt-4 flex items-center justify-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                <Clock className="h-4 w-4" />
                Paiement en cours de vérification…
              </p>
            )}

            <Button
              type="button"
              loading={isPending}
              onClick={pay}
              className="mt-6 h-12 w-full gap-2 rounded-none text-base font-semibold text-white"
              style={{ backgroundColor: charter.orange }}
            >
              <CreditCard className="h-5 w-5" />
              {state.pending ? "Reprendre le paiement" : `Payer ${state.amount.toLocaleString("fr-FR")} FCFA`}
            </Button>

            <Button
              type="button"
              variant="outline"
              loading={isPending}
              onClick={refresh}
              className="mt-3 w-full gap-2 rounded-none"
            >
              <RefreshCw className="h-4 w-4" />
              J&apos;ai payé mais mon statut n&apos;est pas à jour
            </Button>
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
        {info && <p className="mt-4 text-center text-sm text-muted-foreground">{info}</p>}
      </div>
    </section>
  );
}
