"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import {
  exportAmbassadorsCsvAction,
  exportParticipantsCsvAction,
  getEditionStatsAction,
} from "@/actions/stats-actions";
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
type Stats = Awaited<ReturnType<typeof getEditionStatsAction>>;

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

const STATUS_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  EN_COURS_ANALYSE: "En analyse",
  RETENU: "Retenu",
  NON_RETENU: "Non retenu",
  LISTE_ATTENTE: "Liste d'attente",
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold" style={{ color: charter.orange }}>
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatsDashboard({
  editions,
  initialEditionId,
  initialStats,
  canExportAmbassadors,
  canExportParticipants,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialStats: Stats | null;
  canExportAmbassadors: boolean;
  canExportParticipants: boolean;
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const edition = editions.find(item => item.id === editionId);

  const run = (task: () => Promise<void>) => {
    setError("");
    startTransition(async () => {
      try {
        await task();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    run(async () => setStats(await getEditionStatsAction(value)));
  };

  const exportAmbassadors = () =>
    run(async () => {
      downloadCsv(await exportAmbassadorsCsvAction(editionId), `ambassadeurs-${edition?.year ?? ""}.csv`);
    });

  const exportParticipants = () =>
    run(async () => {
      downloadCsv(await exportParticipantsCsvAction(editionId), `participants-${edition?.year ?? ""}.csv`);
    });

  const maxStage = Math.max(1, ...(stats?.ambassadors.byStage.map(item => item.count) ?? [1]));

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Pilotage</p>
          <h1 className="mt-1 text-3xl font-bold">Statistiques</h1>
          <p className="mt-2 text-muted-foreground">Vue d&apos;ensemble de l&apos;édition, nationale et par région.</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={editionId} onValueChange={changeEdition}>
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir une édition">
                {(value: string) => {
                  const item = editions.find(entry => entry.id === value);
                  return item ? `${item.name} (${item.year})` : "Choisir une édition";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {editions.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} ({item.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      {(canExportAmbassadors || canExportParticipants) && stats && (
        <div className="flex flex-wrap gap-3">
          {canExportAmbassadors && (
            <Button type="button" variant="outline" loading={isPending} onClick={exportAmbassadors} className="rounded-none">
              <Download className="mr-2 h-4 w-4" />
              Exporter les ambassadeurs (CSV)
            </Button>
          )}
          {canExportParticipants && (
            <Button type="button" variant="outline" loading={isPending} onClick={exportParticipants} className="rounded-none">
              <Download className="mr-2 h-4 w-4" />
              Exporter les participants (CSV)
            </Button>
          )}
        </div>
      )}

      {!stats ? (
        <p className="rounded-2xl border bg-card px-5 py-12 text-center text-muted-foreground shadow-sm">
          Aucune édition disponible.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Candidatures ambassadeurs" value={stats.ambassadors.total} />
            <Tile
              label="Paiements validés"
              value={stats.ambassadors.paid}
              hint={`${stats.ambassadors.revenue.toLocaleString("fr-FR")} FCFA encaissés`}
            />
            <Tile label="Sélectionnés" value={stats.ambassadors.selected} />
            <Tile label="Badges émis" value={stats.badges} />
            <Tile label="Embarqués" value={stats.ambassadors.boarded} />
            <Tile label="Ambassadeurs présents" value={stats.ambassadors.present} />
            <Tile label="Candidatures participants" value={stats.participants.total} />
            <Tile label="Candidatures Jeunes Leaders" value={stats.leaders} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Entonnoir ambassadeurs</h2>
              <p className="text-sm text-muted-foreground">Candidatures retenues, par étape actuelle.</p>
              <div className="mt-4 space-y-2">
                {stats.ambassadors.byStage.map(item => (
                  <div key={item.stage} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 text-muted-foreground">{STAGE_LABEL[item.stage]}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(item.count / maxStage) * 100}%`, backgroundColor: charter.orange }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Répartition des statuts</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ambassadeurs</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {stats.ambassadors.byStatus.map(item => (
                      <li key={item.status} className="flex justify-between">
                        <span>{STATUS_LABEL[item.status] ?? item.status}</span>
                        <span className="font-medium">{item.count}</span>
                      </li>
                    ))}
                    {stats.ambassadors.byStatus.length === 0 && <li className="text-muted-foreground">—</li>}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participants</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {stats.participants.byStatus.map(item => (
                      <li key={item.status} className="flex justify-between">
                        <span>{STATUS_LABEL[item.status] ?? item.status}</span>
                        <span className="font-medium">{item.count}</span>
                      </li>
                    ))}
                    {stats.participants.byStatus.length === 0 && <li className="text-muted-foreground">—</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold">Par région</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Région</th>
                    <th className="px-3 py-3 text-right">Quota</th>
                    <th className="px-3 py-3 text-right">Candidatures</th>
                    <th className="px-3 py-3 text-right">Payés</th>
                    <th className="px-3 py-3 text-right">Sélectionnés</th>
                    <th className="px-3 py-3 text-right">Embarqués</th>
                    <th className="px-5 py-3 text-right">Présents</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.regions.map(row => (
                    <tr key={row.regionId}>
                      <td className="px-5 py-3 font-medium">{row.name}</td>
                      <td className="px-3 py-3 text-right">{row.quota}</td>
                      <td className="px-3 py-3 text-right">{row.candidatures}</td>
                      <td className="px-3 py-3 text-right">{row.paid}</td>
                      <td className="px-3 py-3 text-right">{row.selected}</td>
                      <td className="px-3 py-3 text-right">{row.boarded}</td>
                      <td className="px-5 py-3 text-right">{row.present}</td>
                    </tr>
                  ))}
                  {stats.regions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                        Aucune donnée régionale.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
