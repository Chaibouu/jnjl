"use client";

import { useState, useTransition } from "react";
import { Check, LifeBuoy, X } from "lucide-react";
import {
  decideRepechageAction,
  getRepechageCandidatesAction,
} from "@/actions/repechage-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };
type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  quizScore: number | null;
  rank: number | null;
  region: { id: string; name: string; code: string };
  repechage: {
    status: string;
    justification: string;
    createdAt: Date;
    decidedBy: { name: string | null };
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  VALIDE: "Repêché",
  REFUSE: "Refusé",
  EN_ATTENTE: "En attente",
};

export function RepechageManager({
  editions,
  initialEditionId,
  initialCandidates,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialCandidates: Candidate[];
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dialogTarget, setDialogTarget] = useState<{
    candidate: Candidate;
    decision: "VALIDE" | "REFUSE";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = (newEditionId: string) => {
    setError("");
    startTransition(async () => {
      try {
        setCandidates(await getRepechageCandidatesAction(newEditionId));
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    setMessage("");
    refresh(value);
  };

  const pending = candidates.filter(candidate => !candidate.repechage);
  const decided = candidates.filter(candidate => candidate.repechage);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Ambassadeurs
          </p>
          <h1 className="mt-1 text-3xl font-bold">Repêchage</h1>
          <p className="mt-2 text-muted-foreground">
            Repêchage manuel exceptionnel des candidats non sélectionnés par le quota — toujours justifié.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={editionId} onValueChange={changeEdition}>
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir une édition">
                {(value: string) => {
                  const edition = editions.find(item => item.id === value);
                  return edition ? `${edition.name} (${edition.year})` : "Choisir une édition";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {editions.map(edition => (
                <SelectItem key={edition.id} value={edition.id}>
                  {edition.name} ({edition.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">En attente de décision</h2>
          <p className="text-sm text-muted-foreground">
            {pending.length} candidat{pending.length !== 1 ? "s" : ""} non sélectionné{pending.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y">
          {pending.map(candidate => (
            <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-medium">
                  {candidate.firstName} {candidate.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {candidate.email} · {candidate.region.name} · Rang {candidate.rank ?? "—"} · Score{" "}
                  {candidate.quizScore != null ? `${candidate.quizScore.toFixed(0)}%` : "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setDialogTarget({ candidate, decision: "VALIDE" })}
                  className="rounded-none text-green-700 hover:border-green-500 hover:bg-green-50"
                >
                  <LifeBuoy className="mr-1.5 h-4 w-4" />
                  Repêcher
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setDialogTarget({ candidate, decision: "REFUSE" })}
                  className="rounded-none text-destructive hover:border-red-500 hover:bg-red-50"
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Refuser
                </Button>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <p className="px-5 py-12 text-center text-muted-foreground">
              Aucun candidat en attente de repêchage.
            </p>
          )}
        </div>
      </div>

      {decided.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Décisions prises</h2>
          </div>
          <div className="divide-y">
            {decided.map(candidate => (
              <div key={candidate.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {candidate.firstName} {candidate.lastName}
                    <span className="ml-2 text-xs text-muted-foreground">{candidate.region.name}</span>
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      candidate.repechage?.status === "VALIDE"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {STATUS_LABEL[candidate.repechage?.status ?? ""] ?? candidate.repechage?.status}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {candidate.repechage?.justification}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Décidé par {candidate.repechage?.decidedBy.name ?? "—"} le{" "}
                  {candidate.repechage &&
                    new Date(candidate.repechage.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <RepechageDialog
        target={dialogTarget}
        onClose={() => setDialogTarget(null)}
        onSuccess={decidedCandidateId => {
          setDialogTarget(null);
          setMessage(
            dialogTarget?.decision === "VALIDE" ? "Candidat repêché" : "Repêchage refusé"
          );
          setCandidates(current => current.filter(item => item.id !== decidedCandidateId));
          refresh(editionId);
        }}
      />
    </section>
  );
}

function RepechageDialog({
  target,
  onClose,
  onSuccess,
}: {
  target: { candidate: Candidate; decision: "VALIDE" | "REFUSE" } | null;
  onClose: () => void;
  onSuccess: (applicationId: string) => void;
}) {
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) return;
    setError("");
    startTransition(async () => {
      try {
        await decideRepechageAction(target.candidate.id, target.decision, justification);
        setJustification("");
        onSuccess(target.candidate.id);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <Dialog
      open={!!target}
      onOpenChange={open => {
        if (!open) {
          setJustification("");
          setError("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target?.decision === "VALIDE" ? "Repêcher" : "Refuser le repêchage de"}{" "}
            {target && `${target.candidate.firstName} ${target.candidate.lastName}`}
          </DialogTitle>
        </DialogHeader>
        <form id="repechage-form" onSubmit={submit} className="space-y-4">
          <Field>
            <FieldLabel>Justification</FieldLabel>
            <Textarea
              value={justification}
              onChange={event => setJustification(event.target.value)}
              required
              minLength={10}
              placeholder="Motif de la décision (obligatoire, tracé pour audit)..."
              className="min-h-[100px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="cancel" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="repechage-form"
            loading={isPending} disabled={justification.trim().length < 10}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
          >
            {isPending ? "Enregistrement..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
