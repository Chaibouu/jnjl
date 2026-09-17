"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";
import { deleteRegionAction } from "@/actions/region-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegionDialog } from "@/components/admin/RegionDialog";
import charter from "@/settings/charter";

type Region = {
  id: string;
  name: string;
  code: string;
  _count: {
    userProfiles: number;
    quotas: number;
    applications: number;
    eventApplications: number;
    boardings: number;
  };
};

const emptyCounts = {
  userProfiles: 0,
  quotas: 0,
  applications: 0,
  eventApplications: 0,
  boardings: 0,
};

export function RegionManager({
  initialRegions,
}: {
  initialRegions: Region[];
}) {
  const [regions, setRegions] = useState(initialRegions);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? regions.filter((region) =>
          `${region.name} ${region.code}`.toLowerCase().includes(query)
        )
      : regions;
  }, [search, regions]);

  const openCreate = () => {
    setMessage("");
    setError("");
    setEditingRegion(null);
    setDialogOpen(true);
  };

  const openEdit = (region: Region) => {
    setMessage("");
    setError("");
    setEditingRegion(region);
    setDialogOpen(true);
  };

  const handleSaved = (saved: { id: string; name: string; code: string }) => {
    setRegions((items) => {
      const current = items.find((item) => item.id === saved.id);
      const nextRegion = { ...saved, _count: current?._count ?? emptyCounts };
      return editingRegion
        ? items.map((item) => (item.id === saved.id ? nextRegion : item))
        : [...items, nextRegion].sort((a, b) => a.name.localeCompare(b.name));
    });
    setMessage(editingRegion ? "Région modifiée" : "Région créée");
  };

  const remove = (region: Region) => {
    if (!window.confirm(`Supprimer la région ${region.name} ?`)) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        await deleteRegionAction(region.id);
        setRegions((items) => items.filter((item) => item.id !== region.id));
        setMessage("Région supprimée");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-bold">Régions du Niger</h1>
          <p className="mt-2 text-muted-foreground">
            Référentiel géographique utilisé par les profils, candidatures et
            quotas régionaux des Ambassadeurs.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une région
        </Button>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Régions enregistrées</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} région{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        {message && (
          <p className="border-b px-5 py-3 text-sm text-green-600">
            {message}
          </p>
        )}
        {error && (
          <p className="border-b px-5 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Région</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Références</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((region) => {
                const references = Object.values(region._count).reduce(
                  (total, count) => total + count,
                  0
                );
                return (
                  <tr
                    key={region.id}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary transition-transform group-hover:scale-105">
                          {region.code.slice(0, 2)}
                        </div>
                        <p className="font-medium">{region.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {region.code}
                    </td>
                    <td className="px-5 py-4">
                      {references > 0 ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                          {references} référence{references !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Aucune
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Modifier"
                          onClick={() => openEdit(region)}
                          className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title={
                            references > 0
                              ? "Région utilisée — suppression impossible"
                              : "Supprimer"
                          }
                          onClick={() => remove(region)}
                          disabled={isPending || references > 0}
                          className="hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Aucune région trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RegionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        region={editingRegion}
        onSaved={handleSaved}
      />
    </section>
  );
}
