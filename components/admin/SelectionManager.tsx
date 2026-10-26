"use client";

import { useState, useTransition } from "react";
import { ListOrdered, Trophy, Users } from "lucide-react";
import {
  removeFromSelectionAction,
  restoreToSelectionAction,
} from "@/actions/selection-withdrawal-actions";
import {
  computeRankingAction,
  getRankingAction,
  runSelectionAction,
} from "@/actions/selection-actions";
import { setRegionalQuotaAction } from "@/actions/quota-actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };
type Application = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  quizScore: number | null;
  rank: number | null;
  stage: string;
  status: string;
  selection: { status: string; rank: number | null; withdrawnAt: Date | null; withdrawnReason: string | null } | null;
};
type RegionGroup = {
  region: { id: string; name: string; code: string };
  quota: number;
  applications: Application[];
};

const SELECTION_LABEL: Record<string, string> = {
  SELECTIONNE: "Sélectionné",
  NON_SELECTIONNE: "Non sélectionné",
};

export function SelectionManager({
  editions,
  initialEditionId,
  initialGroups,
  canManage = false,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialGroups: RegionGroup[];
  /** Admin / super admin : peut retirer un ambassadeur de la sélection ou l'y remettre. */
  canManage?: boolean;
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [groups, setGroups] = useState(initialGroups);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm, prompt } = useConfirm();

  const refresh = (newEditionId: string, successMessage?: string) => {
    setError("");
    startTransition(async () => {
      try {
        setGroups(await getRankingAction(newEditionId));
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

  const changeQuota = (regionId: string, quota: number) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await setRegionalQuotaAction(editionId, regionId, quota);
        setGroups(current =>
          current.map(group =>
            group.region.id === regionId ? { ...group, quota } : group
          )
        );
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const launchRanking = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await computeRankingAction(editionId);
        refresh(editionId, `Classement calculé pour ${result.count} candidat(s)`);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const launchSelection = async () => {
    const confirmed = await confirm({
      title: "Lancer la sélection ?",
      description:
        "Le quota régional sera appliqué à tous les candidats classés. Les candidats concernés seront notifiés du résultat.",
      confirmLabel: "Lancer la sélection",
    });
    if (!confirmed) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await runSelectionAction(editionId);
        refresh(editionId, `Sélection appliquée pour ${result.count} candidat(s)`);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const removeFromSelection = async (application: Application) => {
    const reason = await prompt({
      title: `Retirer ${application.firstName} ${application.lastName} de la sélection ?`,
      description:
        "Son engagement et son badge seront annulés. Sa place ira automatiquement au suivant du classement de la région. Impossible si son embarquement est déjà validé.",
      label: "Motif du retrait (obligatoire)",
      confirmLabel: "Retirer de la sélection",
      variant: "destructive",
    });
    if (!reason) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await removeFromSelectionAction(application.id, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh(
        editionId,
        result.replacement
          ? `Retiré de la sélection. ${result.replacement} prend sa place.`
          : "Retiré de la sélection. Aucun candidat suivant disponible dans le classement."
      );
    });
  };

  const restoreToSelection = async (application: Application) => {
    const confirmed = await confirm({
      title: `Remettre ${application.firstName} ${application.lastName} dans la sélection ?`,
      description: "Il reviendra hors quota, sans déloger la personne qui a pris sa place.",
      confirmLabel: "Remettre dans la sélection",
    });
    if (!confirmed) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await restoreToSelectionAction(application.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh(editionId, "Remis dans la sélection.");
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Ambassadeurs
          </p>
          <h1 className="mt-1 text-3xl font-bold">Classement &amp; Sélection</h1>
          <p className="mt-2 text-muted-foreground">
            Définissez les quotas régionaux, calculez le classement puis lancez la sélection.
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

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          loading={isPending}
          onClick={launchRanking}
          className="rounded-none px-4 text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          <ListOrdered className="mr-2 h-4 w-4" />
          Lancer le classement
        </Button>
        <Button
          type="button"
          variant="outline"
          loading={isPending}
          onClick={launchSelection}
          className="rounded-none px-4"
        >
          <Trophy className="mr-2 h-4 w-4" />
          Lancer la sélection
        </Button>
      </div>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      {groups.length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          Aucune candidature acceptée pour cette édition.
        </div>
      )}

      {groups.map(group => (
        <div key={group.region.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="text-lg font-semibold">
                {group.region.name} ({group.region.code})
              </h2>
              <p className="text-sm text-muted-foreground">
                {group.applications.length} candidat{group.applications.length !== 1 ? "s" : ""}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              Quota
              <Input
                type="number"
                min={0}
                defaultValue={group.quota}
                onBlur={event => {
                  const value = Number(event.target.value);
                  if (!Number.isNaN(value) && value !== group.quota) {
                    changeQuota(group.region.id, value);
                  }
                }}
                className="h-9 w-20 rounded-none border border-border bg-muted/40 px-2.5 text-center"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Rang</th>
                  <th className="px-5 py-3">Candidat</th>
                  <th className="px-5 py-3">Score QCM</th>
                  <th className="px-5 py-3">Étape</th>
                  <th className="px-5 py-3">Résultat</th>
                  {canManage && <th className="px-5 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {group.applications.map(application => (
                  <tr key={application.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-semibold">{application.rank ?? "—"}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium">
                        {application.firstName} {application.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{application.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      {application.quizScore != null ? `${application.quizScore.toFixed(0)}%` : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{application.stage}</td>
                    <td className="px-5 py-3">
                      {application.selection ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            application.selection.status === "SELECTIONNE"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {SELECTION_LABEL[application.selection.status] ?? application.selection.status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {application.selection?.withdrawnAt && (
                        <p className="mt-1 text-xs text-destructive" title={application.selection.withdrawnReason ?? undefined}>
                          Retiré : {application.selection.withdrawnReason ?? "sans motif"}
                        </p>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-5 py-3 text-right">
                        {application.selection?.status === "SELECTIONNE" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => removeFromSelection(application)}
                          >
                            Retirer / remplacer
                          </Button>
                        )}
                        {application.selection?.withdrawnAt && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => restoreToSelection(application)}
                          >
                            Remettre
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
