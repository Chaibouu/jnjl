"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FileSpreadsheet, FileText, Globe, Loader2, Phone, Search, Smartphone, Users } from "lucide-react";
import {
  exportSelectedAmbassadorsExcelAction,
  exportSelectedAmbassadorsPdfAction,
  listSelectedAmbassadorsAction,
  type PaymentChannelFilter,
  type SelectedAmbassadorRow,
} from "@/actions/selected-ambassadors-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

const CHANNEL_OPTIONS: { value: PaymentChannelFilter; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "ONLINE", label: "Payé en ligne" },
  { value: "POINT_FOCAL", label: "Payé via le point focal" },
];

const EMPTY_COUNTS = { total: 0, online: 0, pointFocal: 0, women: 0, men: 0 };

function saveBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function initials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");
}

function StatCard({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent?: boolean }) {
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

/** Liste finale des ambassadeurs sélectionnés (issus de la sélection), filtrable et exportable. */
export function SelectedAmbassadorsList({
  isAdmin,
  regions,
}: {
  isAdmin: boolean;
  regions: { id: string; name: string }[];
}) {
  const [channel, setChannel] = useState<PaymentChannelFilter>("ALL");
  const [regionId, setRegionId] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<SelectedAmbassadorRow[]>([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [regionLabel, setRegionLabel] = useState("");
  const [error, setError] = useState("");
  const [isLoading, startLoading] = useTransition();
  const [isExporting, startExport] = useTransition();

  useEffect(() => {
    startLoading(async () => {
      const result = await listSelectedAmbassadorsAction(channel, regionId || undefined);
      if (result.ok) {
        setRows(result.rows);
        setCounts(result.counts);
        setRegionLabel(result.regionLabel);
        setError("");
      } else {
        setError(result.error);
      }
    });
  }, [channel, regionId]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row => `${row.fullName} ${row.phone} ${row.email} ${row.region}`.toLowerCase().includes(term));
  }, [rows, search]);

  const exportAs = (kind: "pdf" | "excel") =>
    startExport(async () => {
      const result =
        kind === "pdf"
          ? await exportSelectedAmbassadorsPdfAction(channel, regionId || undefined)
          : await exportSelectedAmbassadorsExcelAction(channel, regionId || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      saveBase64(
        result.base64,
        result.filename,
        kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    });

  const selectClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ambassadeurs sélectionnés" value={counts.total} hint={regionLabel || undefined} accent />
        <StatCard label="Payé en ligne" value={counts.online} hint="Sur la plateforme" />
        <StatCard label="Payé via le point focal" value={counts.pointFocal} hint="Paiement enregistré" />
        <StatCard label="Femmes" value={counts.women} hint={`${counts.men} homme${counts.men > 1 ? "s" : ""}`} />
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
          {isAdmin && (
            <label className="space-y-1">
              <span className="block text-xs font-medium text-muted-foreground">Région</span>
              <select className={selectClass} value={regionId} onChange={event => setRegionId(event.target.value)}>
                <option value="">Toutes les régions</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Mode de paiement</span>
            <select
              className={selectClass}
              value={channel}
              onChange={event => setChannel(event.target.value as PaymentChannelFilter)}
            >
              {CHANNEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Rechercher</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${selectClass} pl-9`}
                placeholder="Nom, téléphone, e-mail…"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </span>
          </label>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" className="h-10" disabled={isExporting || rows.length === 0} onClick={() => exportAs("pdf")}>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button type="button" variant="outline" className="h-10" disabled={isExporting || rows.length === 0} onClick={() => exportAs("excel")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" style={{ color: charter.orange }} />
            {visibleRows.length} ambassadeur{visibleRows.length > 1 ? "s" : ""} affiché{visibleRows.length > 1 ? "s" : ""}
          </p>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-2.5">N°</th>
                <th className="px-4 py-2.5">Ambassadeur</th>
                <th className="px-4 py-2.5">Téléphone</th>
                <th className="px-4 py-2.5">Région</th>
                <th className="px-4 py-2.5">Paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map((row, index) => (
                <tr key={row.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: row.gender === "Féminin" ? charter.orange : "#0DB02B" }}
                      >
                        {initials(row.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.gender}
                          {row.gender && row.email ? " · " : ""}
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.region}</td>
                  <td className="px-4 py-3">
                    {row.channel === "ONLINE" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <Globe className="h-3.5 w-3.5" />
                        En ligne
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <Smartphone className="h-3.5 w-3.5" />
                        Point focal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun ambassadeur sélectionné pour ces filtres.
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
