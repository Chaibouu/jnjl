"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Award, Search } from "lucide-react";
import { listAmbassadorProgressAction } from "@/actions/ambassador-progress-actions";
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
type Row = Awaited<ReturnType<typeof listAmbassadorProgressAction>>[number];

/** Ordre du parcours (voir AmbassadorStage dans prisma/schema.prisma). */
const STAGE_ORDER = [
  "CANDIDATURE",
  "PAIEMENT",
  "FORMATION",
  "QCM",
  "CLASSEMENT",
  "SELECTION",
  "REPECHAGE",
  "ENGAGEMENT",
  "BADGE",
  "EMBARQUEMENT",
  "PRESENCE",
  "ATTESTATION",
] as const;

const STAGE_LABEL: Record<string, string> = {
  CANDIDATURE: "Candidature",
  PAIEMENT: "Paiement",
  FORMATION: "Formation",
  QCM: "QCM",
  CLASSEMENT: "Classement",
  SELECTION: "Sélection",
  REPECHAGE: "Repêchage",
  ENGAGEMENT: "Engagement",
  BADGE: "Badge",
  EMBARQUEMENT: "Embarquement",
  PRESENCE: "Présence",
  ATTESTATION: "Attestation",
};

const ALL_STAGES = "__all__";
const ALL_REGIONS = "__all__";

function isScreenedOut(row: Row) {
  return row.selectionStatus === "NON_SELECTIONNE" && row.repechageStatus !== "VALIDE";
}

export function AmbassadorProgressTracker({
  editions,
  initialEditionId,
  initialRows,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialRows: Row[];
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [rows, setRows] = useState(initialRows);
  const [stageFilter, setStageFilter] = useState(ALL_STAGES);
  const [regionFilter, setRegionFilter] = useState(ALL_REGIONS);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    setError("");
    startTransition(async () => {
      try {
        setRows(await listAmbassadorProgressAction(value));
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const regions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) map.set(row.region.id, row.region.name);
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const countByStage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(row => {
      if (stageFilter !== ALL_STAGES && row.stage !== stageFilter) return false;
      if (regionFilter !== ALL_REGIONS && row.region.id !== regionFilter) return false;
      if (!query) return true;
      return `${row.firstName} ${row.lastName} ${row.email}`.toLowerCase().includes(query);
    });
  }, [rows, stageFilter, regionFilter, search]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Ambassadeurs</p>
          <h1 className="mt-1 text-3xl font-bold">Suivi du parcours</h1>
          <p className="mt-2 text-muted-foreground">
            À quelle étape se trouve chaque ambassadeur retenu. {rows.length} candidat{rows.length !== 1 ? "s" : ""}
            {regions.length === 1 ? ` — région ${regions[0].name}` : ""}.
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

      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      {/* Répartition par étape — cliquer sur une étape filtre le tableau. */}
      <div className="overflow-x-auto rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex min-w-max gap-2">
          {STAGE_ORDER.map(stage => {
            const count = countByStage.get(stage) ?? 0;
            const active = stageFilter === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(active ? ALL_STAGES : stage)}
                className="flex min-w-[92px] flex-col items-center gap-1 border px-3 py-2.5 text-center transition-colors"
                style={{
                  borderColor: active ? charter.orange : charter.border,
                  backgroundColor: active ? `${charter.orange}14` : "transparent",
                }}
              >
                <span className="text-lg font-bold" style={{ color: active ? charter.orange : charter.ink }}>
                  {count}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">{STAGE_LABEL[stage]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un nom ou un email..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        {regions.length > 1 && (
          <div className="w-full sm:w-56">
            <Select value={regionFilter} onValueChange={value => setRegionFilter(value ?? ALL_REGIONS)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Toutes les régions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_REGIONS}>Toutes les régions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {stageFilter !== ALL_STAGES && (
          <button
            type="button"
            onClick={() => setStageFilter(ALL_STAGES)}
            className="text-sm font-medium underline"
            style={{ color: charter.orange }}
          >
            Réinitialiser le filtre d&apos;étape
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Ambassadeur</th>
                <th className="px-5 py-3">Région</th>
                <th className="px-5 py-3">Étape actuelle</th>
                <th className="px-5 py-3">Score QCM</th>
                <th className="px-5 py-3">Paiement</th>
                <th className="px-5 py-3">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRows.map(row => {
                const screenedOut = isScreenedOut(row);
                return (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm">{row.region.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: row.stage === "ATTESTATION" ? "#dcfce7" : "#F1F1F3",
                            color: row.stage === "ATTESTATION" ? "#15803d" : charter.ink,
                          }}
                        >
                          {STAGE_LABEL[row.stage] ?? row.stage}
                        </span>
                        {screenedOut && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Non sélectionné
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {row.quizScore != null ? `${Math.round(row.quizScore)} %${row.rank ? ` (rang ${row.rank})` : ""}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {row.paymentStatus === "VALIDE" ? (
                        <span className="text-green-700">Validé</span>
                      ) : (
                        <span className="text-muted-foreground">En attente</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {row.badgeNumber ? (
                        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: charter.orange }}>
                          <Award className="h-3.5 w-3.5" /> {row.badgeNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    Aucun ambassadeur ne correspond à ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
