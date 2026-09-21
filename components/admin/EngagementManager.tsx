"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import {
  getEditionEngagementAction,
  listEngagementStatusAction,
  setEditionEngagementTextAction,
} from "@/actions/engagement-actions";
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
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };
type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  region: { name: string };
  engagement: { signatureName: string; fileUrl: string; acceptedAt: Date } | null;
};

export function EngagementManager({
  editions,
  initialEditionId,
  initialText,
  initialCandidates,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialText: string;
  initialCandidates: Candidate[];
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [text, setText] = useState(initialText);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const refresh = (newEditionId: string) => {
    setError("");
    startTransition(async () => {
      try {
        const [edition, list] = await Promise.all([
          getEditionEngagementAction(newEditionId),
          listEngagementStatusAction(newEditionId),
        ]);
        setText(edition.engagementText ?? "");
        setCandidates(list);
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

  const save = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await setEditionEngagementTextAction(editionId, text);
        setMessage("Fiche d'engagement enregistrée");
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Ambassadeurs
          </p>
          <h1 className="mt-1 text-3xl font-bold">Engagement</h1>
          <p className="mt-2 text-muted-foreground">
            Rédigez la fiche d&apos;engagement et suivez qui l&apos;a signée.
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

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <Field>
          <FieldLabel>Texte de la fiche d&apos;engagement</FieldLabel>
          <Textarea
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder="Rédigez ici l'engagement que chaque ambassadeur devra accepter avant de recevoir son badge..."
            className="min-h-[200px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
          />
        </Field>
        <Button
          type="button"
          loading={isPending}
          onClick={save}
          className="mt-4 rounded-none text-white hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          Enregistrer
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Suivi des signatures</h2>
          <p className="text-sm text-muted-foreground">
            {candidates.filter(c => c.engagement).length} / {candidates.length} signée(s)
          </p>
        </div>
        <div className="divide-y">
          {candidates.map(candidate => (
            <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-medium">
                  {candidate.firstName} {candidate.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {candidate.email} · {candidate.region.name}
                </p>
              </div>
              {candidate.engagement ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Signé par {candidate.engagement.signatureName}
                  </span>
                  <a
                    href={candidate.engagement.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium underline"
                    style={{ color: charter.orange }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </a>
                </div>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  En attente
                </span>
              )}
            </div>
          ))}
          {candidates.length === 0 && (
            <p className="px-5 py-12 text-center text-muted-foreground">
              Aucun candidat n&apos;a encore atteint l&apos;étape Engagement.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
