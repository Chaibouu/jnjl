"use client";

import { useMemo, useState, useTransition } from "react";
import { FileSpreadsheet, Search } from "lucide-react";
import {
  exportParticipantAttendanceExcelAction,
  type ParticipantAttendanceRow,
} from "@/actions/participant-attendance-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

type Status = "ALL" | "PRESENT" | "ABSENT";

const selectClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function Stat({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl border bg-card p-4 shadow-sm"
      style={accent ? { borderColor: charter.orange, background: `${charter.orange}0d` } : undefined}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums" style={accent ? { color: charter.orange } : undefined}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Pointage des participants à l'événement : présents / absents, filtres et export Excel. */
export function ParticipantAttendanceView({
  editionId,
  rows,
}: {
  editionId: string;
  rows: ParticipantAttendanceRow[];
}) {
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState<Status>("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isExporting, startExport] = useTransition();

  const regions = useMemo(() => [...new Set(rows.map(row => row.region).filter(Boolean))].sort(), [rows]);

  // Les compteurs suivent la région choisie, pas l'état de présence ni la recherche.
  const inRegion = useMemo(() => rows.filter(row => !region || row.region === region), [rows, region]);
  const present = inRegion.filter(row => row.firstCheckIn).length;
  const rate = inRegion.length ? Math.round((present / inRegion.length) * 100) : 0;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inRegion.filter(
      row =>
        (status === "ALL" || (status === "PRESENT") === !!row.firstCheckIn) &&
        (!query || `${row.fullName} ${row.phone} ${row.badgeNumber}`.toLowerCase().includes(query))
    );
  }, [inRegion, status, search]);

  const exportExcel = () =>
    startExport(async () => {
      setError("");
      const result = await exportParticipantAttendanceExcelAction(editionId, { region: region || undefined, status, search });
      if (!result.ok) return setError(result.error);
      const bytes = Uint8Array.from(atob(result.base64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Participants inscrits" value={inRegion.length} hint={region || "Toutes les régions"} />
        <Stat label="Présents (pointés)" value={present} accent />
        <Stat label="Pas encore pointés" value={inRegion.length - present} />
        <Stat label="Taux de présence" value={`${rate} %`} />
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Région</span>
            <select className={selectClass} value={region} onChange={event => setRegion(event.target.value)}>
              <option value="">Toutes les régions</option>
              {regions.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Présence</span>
            <select className={selectClass} value={status} onChange={event => setStatus(event.target.value as Status)}>
              <option value="ALL">Tous</option>
              <option value="PRESENT">Présents</option>
              <option value="ABSENT">Pas encore pointés</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Rechercher</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${selectClass} pl-9`}
                placeholder="Nom, téléphone, n° de badge…"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </span>
          </label>
          <div className="flex items-end">
            <Button type="button" variant="outline" className="h-10" disabled={isExporting || visible.length === 0} onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          {visible.length} participant{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Participant</th>
                <th className="px-4 py-2.5">Région</th>
                <th className="px-4 py-2.5">N° badge</th>
                <th className="px-4 py-2.5">Présence</th>
                <th className="px-4 py-2.5">Premier pointage</th>
                <th className="px-4 py-2.5 text-right">Pointages</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map(row => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.gender}
                      {row.gender && row.phone ? " · " : ""}
                      {row.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3">{row.region}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.badgeNumber}</td>
                  <td className="px-4 py-3">
                    {row.firstCheckIn ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Présent</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Pas encore pointé
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.firstCheckIn ? new Date(row.firstCheckIn).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.checkIns}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun participant pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
