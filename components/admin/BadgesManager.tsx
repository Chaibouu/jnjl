"use client";

import { useState, useTransition } from "react";
import { Award, BadgeCheck, Printer } from "lucide-react";
import {
  awardAllAmbassadorBadgesAction,
  awardAmbassadorBadgeAction,
  printAmbassadorBadgesAction,
  resyncBadgeQrsAction,
  listBadgeCandidatesAction,
} from "@/actions/badge-actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { BADGE_LAYOUT_OPTIONS, downloadBadgesInParts, type BadgeLayout } from "@/lib/download-pdf";
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
  region: { id: string; name: string };
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
  const { confirm } = useConfirm();
  const pendingCount = candidates.filter(candidate => !candidate.badge).length;
  const [printRegionId, setPrintRegionId] = useState("");
  const [layout, setLayout] = useState<BadgeLayout>("a5x2");
  const awardedCount = candidates.filter(candidate => candidate.badge).length;
  const regionOptions = Array.from(
    new Map(candidates.map(candidate => [candidate.region.id, candidate.region.name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1], "fr"));

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

  const resync = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await resyncBadgeQrsAction(editionId);
        if (result.total === 0) setMessage("Tous les QR sont déjà synchronisés avec ScanHub.");
        else if (result.failed === 0) setMessage(`${result.synced} QR synchronisé(s) avec ScanHub.`);
        else setError(`${result.synced} synchronisé(s), ${result.failed} en échec : ${result.error ?? "erreur inconnue"}`);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const printBadges = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        let printed = 0;
        let notSynced = 0;
        const downloaded = await downloadBadgesInParts(
          async part => {
            const result = await printAmbassadorBadgesAction(editionId, printRegionId || null, part);
            printed = result.printed;
            notSynced = result.notSynced;
            return result.part;
          },
          "badges-ambassadeurs.pdf",
          layout,
          (done, total) => setMessage(`Préparation des badges… ${done}/${total}`)
        );
        if (!downloaded) {
          setMessage("");
          setError(
            notSynced > 0
              ? `${notSynced} badge(s) n'ont pas de QR ScanHub : cliquez d'abord sur « Resynchroniser les QR (ScanHub) ».`
              : "Aucun badge attribué à imprimer pour cette sélection."
          );
          return;
        }
        setMessage(
          `${printed} badge(s) prêts à imprimer.` +
            (notSynced > 0
              ? ` ${notSynced} ignoré(s) : QR non synchronisé, cliquez sur « Resynchroniser les QR (ScanHub) ».`
              : "")
        );
      } catch (actionError) {
        setMessage("");
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const awardAll = async () => {
    const confirmed = await confirm({
      title: "Attribuer le badge à tous ?",
      description: `${pendingCount} ambassadeur(s) recevront leur badge et une notification. Pour n'en attribuer qu'un seul, utilisez « Attribuer le badge » sur sa ligne.`,
      confirmLabel: "Attribuer à tous",
    });
    if (!confirmed) return;
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
        <Button type="button" variant="outline" loading={isPending} onClick={resync} className="ml-2 rounded-none">
          Resynchroniser les QR (ScanHub)
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Impression en lot — région
          <select
            value={printRegionId}
            onChange={event => setPrintRegionId(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground"
          >
            <option value="">Toutes les régions</option>
            {regionOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Mise en page
          <select
            value={layout}
            onChange={event => setLayout(event.target.value as BadgeLayout)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground"
          >
            {BADGE_LAYOUT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          loading={isPending}
          disabled={awardedCount === 0}
          onClick={printBadges}
          className="h-10 gap-2 rounded-none"
        >
          <Printer className="h-4 w-4" />
          Imprimer les badges attribués (PDF)
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
