"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Search } from "lucide-react";
import {
  listInPersonTrainingAction,
  markInPersonTrainingDoneAction,
} from "@/actions/inperson-training-actions";
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

type EditionOption = { id: string; name: string; year: number };
type Rows = Awaited<ReturnType<typeof listInPersonTrainingAction>>;

const FILTERS = [
  ["TODO", "À faire"],
  ["DONE", "Faite"],
  ["ALL", "Tous"],
] as const;

export function InPersonTrainingManager({
  editions,
  initialEditionId,
  initialRows,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialRows: Rows;
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"TODO" | "DONE" | "ALL">("TODO");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirm();

  const todoCount = rows.filter(row => !row.doneAt).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(row => {
      if (filter === "TODO" && row.doneAt) return false;
      if (filter === "DONE" && !row.doneAt) return false;
      return !query || `${row.fullName} ${row.region} ${row.phone}`.toLowerCase().includes(query);
    });
  }, [rows, search, filter]);

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    setError("");
    startTransition(async () => {
      try {
        setRows(await listInPersonTrainingAction(value));
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const markDone = async (row: Rows[number]) => {
    const confirmed = await confirm({
      title: "Marquer la formation comme faite ?",
      description: `${row.fullName} (${row.region}) a suivi la formation présentielle.`,
      confirmLabel: "Formation faite",
    });
    if (!confirmed) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await markInPersonTrainingDoneAction(row.id);
        setRows(await listInPersonTrainingAction(editionId));
        setMessage(`Formation validée pour ${row.fullName}.`);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Ambassadeurs</p>
          <h1 className="mt-1 text-3xl font-bold">Formation présentielle</h1>
          <p className="mt-2 text-muted-foreground">
            Ambassadeurs ayant payé et devant suivre la formation. {todoCount} à faire.
          </p>
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

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {FILTERS.map(([code, label]) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant={filter === code ? "default" : "outline"}
                onClick={() => setFilter(code)}
                className="rounded-none"
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
        {message && <p className="border-b px-5 py-3 text-sm text-green-600">{message}</p>}
        {error && <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Ambassadeur</th>
                <th className="px-5 py-4">Région</th>
                <th className="px-5 py-4">Formation</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-xs text-muted-foreground">{row.phone}</p>
                  </td>
                  <td className="px-5 py-4">{row.region}</td>
                  <td className="px-5 py-4">
                    {row.doneAt ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        Faite le {new Date(row.doneAt).toLocaleDateString("fr-FR")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        À faire
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {!row.doneAt && (
                      <Button
                        type="button"
                        size="sm"
                        loading={isPending}
                        onClick={() => markDone(row)}
                        className="gap-2 rounded-none"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Formation faite
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                    Aucun ambassadeur.
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
