"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Search } from "lucide-react";
import { decideNameChangeAction, listNameChangeRequestsAction } from "@/actions/name-change-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-provider";

const ALL = "ALL";
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

/** Minuscules sans accents : « Aïssatou » se trouve en tapant « aissatou ». */
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

type Row = NonNullable<Awaited<ReturnType<typeof listNameChangeRequestsAction>>>[number];

const STATUS: Record<string, { label: string; className: string }> = {
  EN_ATTENTE: { label: "En attente", className: "bg-amber-100 text-amber-700" },
  APPROUVEE: { label: "Acceptée", className: "bg-green-100 text-green-700" },
  REFUSEE: { label: "Refusée", className: "bg-red-100 text-red-700" },
};

/** Demandes de correction de nom des ambassadeurs : l'admin accepte (le nom change partout) ou refuse avec un motif. */
export function NameChangeRequests({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm, prompt } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [regionFilter, setRegionFilter] = useState(ALL);

  const regions = useMemo(
    () =>
      Array.from(new Set(rows.map(row => row.ambassadorApplication.region.name))).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [rows]
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const words = normalize(search).split(/\s+/).filter(Boolean);
    return rows.filter(row => {
      if (statusFilter !== ALL && row.status !== statusFilter) return false;
      if (regionFilter !== ALL && row.ambassadorApplication.region.name !== regionFilter) return false;
      if (words.length === 0) return true;
      const haystack = normalize(
        [
          row.oldFirstName,
          row.oldLastName,
          row.firstName,
          row.lastName,
          row.ambassadorApplication.email,
          row.ambassadorApplication.region.name,
          row.reason,
        ].join(" ")
      );
      return words.every(word => haystack.includes(word));
    });
  }, [rows, search, statusFilter, regionFilter]);

  const hasFilters = search.trim() !== "" || statusFilter !== ALL || regionFilter !== ALL;
  const resetFilters = () => {
    setSearch("");
    setStatusFilter(ALL);
    setRegionFilter(ALL);
  };

  const reload = async () => {
    const next = await listNameChangeRequestsAction();
    if (next) setRows(next);
  };

  const approve = async (row: Row) => {
    const ok = await confirm({
      title: "Accepter cette correction ?",
      description: (
        <>
          <strong>
            {row.oldFirstName} {row.oldLastName}
          </strong>{" "}
          deviendra{" "}
          <strong>
            {row.firstName} {row.lastName}
          </strong>{" "}
          sur son profil et sur tous ses documents.
        </>
      ),
      confirmLabel: "Accepter",
    });
    if (!ok) return;
    setError("");
    startTransition(async () => {
      const result = await decideNameChangeAction(row.id, "APPROUVEE", "");
      if (!result.ok) setError(result.error);
      await reload();
    });
  };

  const reject = async (row: Row) => {
    const comment = await prompt({
      title: "Refuser cette correction ?",
      label: "Motif du refus (visible par l'ambassadeur)",
      confirmLabel: "Refuser",
      variant: "destructive",
    });
    if (!comment) return;
    setError("");
    startTransition(async () => {
      const result = await decideNameChangeAction(row.id, "REFUSEE", comment);
      if (!result.ok) setError(result.error);
      await reload();
    });
  };

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {rows.length > 0 && (
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Rechercher un nom, un e-mail, un motif…"
                value={search}
                onChange={event => setSearch(event.target.value)}
                aria-label="Rechercher une demande"
              />
            </div>
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              className={`${selectClass} sm:w-48`}
              aria-label="Filtrer par statut"
            >
              <option value={ALL}>Tous les statuts ({rows.length})</option>
              {Object.entries(STATUS).map(([code, status]) => (
                <option key={code} value={code}>
                  {status.label} ({statusCounts.get(code) ?? 0})
                </option>
              ))}
            </select>
            <select
              value={regionFilter}
              onChange={event => setRegionFilter(event.target.value)}
              className={`${selectClass} sm:w-48`}
              aria-label="Filtrer par région"
            >
              <option value={ALL}>Toutes les régions</option>
              {regions.map(region => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} sur {rows.length} demande{rows.length > 1 ? "s" : ""}
            </span>
            {hasFilters && (
              <button type="button" onClick={resetFilters} className="font-medium text-foreground underline-offset-2 hover:underline">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      )}
      {rows.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          Aucune demande de correction pour le moment.
        </div>
      )}
      {rows.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          Aucune demande ne correspond à ces filtres.
        </div>
      )}
      {filtered.map(row => (
        <div key={row.id} className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {row.oldFirstName} {row.oldLastName}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              {row.firstName} {row.lastName}
            </p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[row.status]?.className ?? ""}`}>
              {STATUS[row.status]?.label ?? row.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {row.ambassadorApplication.email} · {row.ambassadorApplication.region.name} ·{" "}
            {new Date(row.createdAt).toLocaleDateString("fr-FR")}
          </p>
          <p className="rounded-md bg-muted/50 p-3 text-sm">{row.reason}</p>
          {row.decisionComment && <p className="text-xs text-muted-foreground">Décision : {row.decisionComment}</p>}
          {row.status === "EN_ATTENTE" && (
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={isPending} onClick={() => approve(row)}>
                Accepter
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => reject(row)}>
                Refuser
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
