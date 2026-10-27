"use client";

import { useEffect, useState, useTransition } from "react";
import { getMyNameChangeStateAction, requestNameChangeAction } from "@/actions/name-change-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State = Awaited<ReturnType<typeof getMyNameChangeStateAction>>;

/** Demande de correction du nom (ambassadeur) : décidée par un administrateur. */
export function NameChangeRequestForm() {
  const [state, setState] = useState<State>(null);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => getMyNameChangeStateAction().then(setState);
  useEffect(() => {
    void load();
  }, []);

  const pending = state?.nameChangeRequests.find(request => request.status === "EN_ATTENTE");
  const last = state?.nameChangeRequests.find(request => request.status !== "EN_ATTENTE");

  const submit = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await requestNameChangeAction({ firstName, lastName, reason });
      if (result.ok) {
        setFeedback({ ok: true, text: "Demande envoyée : un administrateur va l'examiner." });
        setOpen(false);
        setReason("");
        await load();
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <div className="space-y-3 rounded-md border p-3 text-sm">
      {pending ? (
        <p>
          Demande en attente : <strong>{pending.firstName} {pending.lastName}</strong>. Vous serez notifié(e) de la décision.
        </p>
      ) : (
        <>
          {last && (
            <p className="text-muted-foreground">
              Dernière demande ({last.firstName} {last.lastName}) :{" "}
              {last.status === "APPROUVEE" ? "acceptée" : `refusée${last.decisionComment ? ` — ${last.decisionComment}` : ""}`}.
            </p>
          )}
          {!open && (
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setFirstName(state?.firstName ?? "");
              setLastName(state?.lastName ?? "");
              setOpen(true);
            }}>
              Demander une correction de mon nom
            </Button>
          )}
          {open && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1 text-xs font-medium">
                  Prénom
                  <Input value={firstName} onChange={event => setFirstName(event.target.value)} />
                </label>
                <label className="block space-y-1 text-xs font-medium">
                  Nom
                  <Input value={lastName} onChange={event => setLastName(event.target.value)} />
                </label>
              </div>
              <label className="block space-y-1 text-xs font-medium">
                Motif de la correction
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Ex. Prénom et nom inversés à la candidature, faute de frappe…"
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <Button type="button" size="sm" loading={isPending} onClick={submit}>
                  Envoyer la demande
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {feedback && <p className={feedback.ok ? "text-green-600" : "text-destructive"}>{feedback.text}</p>}
    </div>
  );
}
