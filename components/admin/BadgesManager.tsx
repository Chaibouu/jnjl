"use client";

import { useState, useTransition } from "react";
import { Award, BadgeCheck } from "lucide-react";
import {
  awardAllAmbassadorBadgesAction,
  awardAmbassadorBadgeAction,
  listBadgeCandidatesAction,
} from "@/actions/badge-actions";
import { Button } from "@/components/ui/button";
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
  stage: string;
  region: { name: string };
  badge: { number: string | null; awardedAt: Date } | null;
};

export function BadgesManager({
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
  const [isPending, startTransition] = useTransition();

  const refresh = (newEditionId: string, successMessage?: string) => {
    setError("");
    startTransition(async () => {
      try {
        setCandidates(await listBadgeCandidatesAction(newEditionId));
        if (successMessage) setMessage(successMessage);
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

  const award = (applicationId: string) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await awardAmbassadorBadgeAction(applicationId);
        refresh(editionId, `Badge ${result.number} attribué`);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const awardAll = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await awardAllAmbassadorBadgesAction(editionId);
        refresh(editionId, `${result.count} badge(s) attribué(s)`);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const pendingCount = candidates.filter(candidate => !candidate.badge).length;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Ambassadeurs
          </p>
          <h1 className="mt-1 text-3xl font-bold">Badges</h1>
          <p className="mt-2 text-muted-foreground">
            Attribuez le badge aux ambassadeurs ayant signé leur engagement.
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

      <div>
        <Button
          type="button"
          loading={isPending} disabled={pendingCount === 0}
          onClick={awardAll}
          className="rounded-none px-4 text-white shadow-sm hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: charter.orange }}
        >
          <Award className="mr-2 h-4 w-4" />
          Attribuer à tous ({pendingCount})
        </Button>
      </div>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
              {candidate.badge ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {candidate.badge.number}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => award(candidate.id)}
                  className="rounded-none"
                >
                  <Award className="mr-1.5 h-4 w-4" />
                  Attribuer le badge
                </Button>
              )}
            </div>
          ))}
          {candidates.length === 0 && (
            <p className="px-5 py-12 text-center text-muted-foreground">
              Aucun ambassadeur n&apos;a encore signé son engagement.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
