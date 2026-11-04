"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getRegionTravelDatesAction,
  updateRegionTravelDatesAction,
} from "@/actions/edition-document-settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import charter from "@/settings/charter";

type Row = Awaited<ReturnType<typeof getRegionTravelDatesAction>>[number];

const dateClass = "h-10 rounded-none border border-border bg-muted/40 px-3";

/**
 * Dates de départ et de retour par région : la distance du voyage diffère, donc le départ aussi. Elles s'appliquent à
 * l'ordre de mission et à l'autorisation d'absence des ambassadeurs de la région ; une ligne vide reprend les dates
 * générales ci-dessus.
 */
export function RegionTravelDates({ editionId }: { editionId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setRows(null);
    getRegionTravelDatesAction(editionId)
      .then(result => active && setRows(result))
      .catch(() => active && setMessage({ ok: false, text: "Chargement impossible" }));
    return () => {
      active = false;
    };
  }, [editionId]);

  const change = (regionId: string, field: "departure" | "return", value: string) =>
    setRows(current => current?.map(row => (row.regionId === regionId ? { ...row, [field]: value } : row)) ?? current);

  const save = () => {
    if (!rows) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateRegionTravelDatesAction(editionId, rows);
        setMessage(result.ok ? { ok: true, text: "Dates par région enregistrées" } : { ok: false, text: result.error });
      } catch {
        setMessage({ ok: false, text: "Enregistrement impossible, réessayez" });
      }
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Dates de voyage par région</h2>
        <p className="text-sm text-muted-foreground">
          Départ et retour propres à chaque région, repris dans l&apos;ordre de mission et l&apos;autorisation
          d&apos;absence des ambassadeurs de la région. Laissez vide pour reprendre les dates générales.
        </p>
      </div>
      {!rows ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="divide-y rounded-xl border">
          <div className="hidden grid-cols-[1fr_11rem_11rem] gap-3 bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Région</span>
            <span>Départ</span>
            <span>Retour</span>
          </div>
          {rows.map(row => (
            <div key={row.regionId} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_11rem_11rem] sm:items-center sm:gap-3">
              <span className="font-medium">{row.name}</span>
              <label className="text-xs text-muted-foreground">
                <span className="sm:sr-only">Départ</span>
                <Input
                  type="date"
                  value={row.departure}
                  onChange={event => change(row.regionId, "departure", event.target.value)}
                  className={dateClass}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                <span className="sm:sr-only">Retour</span>
                <Input
                  type="date"
                  value={row.return}
                  onChange={event => change(row.regionId, "return", event.target.value)}
                  className={dateClass}
                />
              </label>
            </div>
          ))}
        </div>
      )}
      {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-destructive"}`}>{message.text}</p>}
      <Button
        type="button"
        loading={isPending}
        disabled={!rows}
        onClick={save}
        className="text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: charter.orange }}
      >
        Enregistrer les dates par région
      </Button>
    </div>
  );
}
