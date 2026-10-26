"use client";

import { useEffect, useState, useTransition } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import {
  exportSelectedAmbassadorsExcelAction,
  exportSelectedAmbassadorsPdfAction,
  listSelectedAmbassadorsAction,
  type PaymentChannelFilter,
  type SelectedAmbassadorRow,
} from "@/actions/selected-ambassadors-actions";
import { Button } from "@/components/ui/button";

const CHANNEL_OPTIONS: { value: PaymentChannelFilter; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "ONLINE", label: "Payé en ligne (plateforme)" },
  { value: "POINT_FOCAL", label: "Payé via le point focal" },
  { value: "UNPAID", label: "Pas encore payé" },
];

const CHANNEL_TEXT = { ONLINE: "En ligne", POINT_FOCAL: "Point focal", UNPAID: "Non payé" } as const;

function saveBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Liste finale des ambassadeurs sélectionnés, filtrable (paiement, région pour les admins) et exportable. */
export function SelectedAmbassadorsList({
  isAdmin,
  regions,
}: {
  isAdmin: boolean;
  regions: { id: string; name: string }[];
}) {
  const [channel, setChannel] = useState<PaymentChannelFilter>("ALL");
  const [regionId, setRegionId] = useState("");
  const [rows, setRows] = useState<SelectedAmbassadorRow[]>([]);
  const [error, setError] = useState("");
  const [isLoading, startLoading] = useTransition();
  const [isExporting, startExport] = useTransition();

  useEffect(() => {
    startLoading(async () => {
      const result = await listSelectedAmbassadorsAction(channel, regionId || undefined);
      if (result.ok) {
        setRows(result.rows);
        setError("");
      } else {
        setError(result.error);
      }
    });
  }, [channel, regionId]);

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

  const selectClass = "h-10 rounded-md border bg-background px-3 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {isAdmin && (
          <label className="space-y-1 text-sm">
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
        <label className="space-y-1 text-sm">
          <span className="block text-xs font-medium text-muted-foreground">Paiement</span>
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
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" disabled={isExporting || rows.length === 0} onClick={() => exportAs("pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button type="button" variant="outline" disabled={isExporting || rows.length === 0} onClick={() => exportAs("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Chargement…" : `${rows.length} ambassadeur${rows.length > 1 ? "s" : ""}`}
      </p>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Nom et prénom</th>
              <th className="px-4 py-3">Sexe</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Région</th>
              <th className="px-4 py-3">Paiement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-2.5 font-medium">{row.fullName}</td>
                <td className="px-4 py-2.5">{row.gender}</td>
                <td className="px-4 py-2.5">{row.phone}</td>
                <td className="px-4 py-2.5">{row.region}</td>
                <td className="px-4 py-2.5">{CHANNEL_TEXT[row.channel]}</td>
              </tr>
            ))}
            {rows.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun ambassadeur pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
