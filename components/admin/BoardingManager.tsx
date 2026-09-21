"use client";

import { useState, useTransition } from "react";
import { Bus, CheckCircle2, XCircle } from "lucide-react";
import { listBoardingAction, setBoardingStatusAction } from "@/actions/boarding-actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EditionOption = { id: string; name: string; year: number };
type Row = Awaited<ReturnType<typeof listBoardingAction>>[number];
type Status = "EN_ATTENTE" | "EMBARQUE" | "ANNULE";

const STATUS_LABEL: Record<Status, string> = {
  EN_ATTENTE: "En attente",
  EMBARQUE: "Embarqué",
  ANNULE: "Annulé",
};
const STATUS_STYLE: Record<Status, string> = {
  EN_ATTENTE: "bg-muted text-muted-foreground",
  EMBARQUE: "bg-green-100 text-green-700",
  ANNULE: "bg-red-100 text-red-700",
};

export function BoardingManager({
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const refresh = (id: string, successMessage?: string) => {
    startTransition(async () => {
      try {
        setRows(await listBoardingAction(id));
        if (successMessage) setMessage(successMessage);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    setMessage("");
    setError("");
    refresh(value);
  };

  const setStatus = (applicationId: string, status: Status) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await setBoardingStatusAction(applicationId, status);
        refresh(editionId, `Embarquement mis à jour : ${STATUS_LABEL[status]}`);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const groups = new Map<string, { name: string; rows: Row[] }>();
  for (const row of rows) {
    if (!groups.has(row.region.id)) groups.set(row.region.id, { name: row.region.name, rows: [] });
    groups.get(row.region.id)!.rows.push(row);
  }
  const boardedCount = rows.filter(row => row.boardingStatus === "EMBARQUE").length;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Ambassadeurs</p>
          <h1 className="mt-1 text-3xl font-bold">Embarquement</h1>
          <p className="mt-2 text-muted-foreground">
            Validez l&apos;embarquement des ambassadeurs vers Niamey, région par région.
            {rows.length > 0 && ` ${boardedCount} / ${rows.length} embarqué(s).`}
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

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      {Array.from(groups.values()).map(group => (
        <div key={group.name} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b p-5">
            <Bus className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{group.name}</h2>
            <span className="text-sm text-muted-foreground">
              {group.rows.filter(row => row.boardingStatus === "EMBARQUE").length} / {group.rows.length}
            </span>
          </div>
          <div className="divide-y">
            {group.rows.map(row => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium">
                    {row.firstName} {row.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.email} · {row.phone}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[row.boardingStatus]}`}
                  >
                    {STATUS_LABEL[row.boardingStatus]}
                  </span>
                  {row.boardingStatus !== "EMBARQUE" && (
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={() => setStatus(row.id, "EMBARQUE")}
                      className="rounded-none"
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Embarquer
                    </Button>
                  )}
                  {row.boardingStatus === "EN_ATTENTE" && (
                    <Button
                      type="button"
                      variant="cancel"
                      disabled={isPending}
                      onClick={() => setStatus(row.id, "ANNULE")}
                      className="rounded-none"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Annuler
                    </Button>
                  )}
                  {row.boardingStatus !== "EN_ATTENTE" && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => setStatus(row.id, "EN_ATTENTE")}
                      className="rounded-none"
                    >
                      Remettre en attente
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="rounded-2xl border bg-card px-5 py-12 text-center text-muted-foreground shadow-sm">
          Aucun ambassadeur badgé n&apos;est encore prêt pour l&apos;embarquement.
        </p>
      )}
    </section>
  );
}
