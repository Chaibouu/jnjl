"use client";

import { useState, useTransition } from "react";
import {
  createRegionAction,
  deleteRegionAction,
  updateRegionAction,
} from "@/actions/region-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export function RegionManager({
  initialRegions,
}: {
  initialRegions: Region[];
}) {
  const [regions, setRegions] = useState(initialRegions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCode("");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const input = { name, code };
        const saved = editingId
          ? await updateRegionAction(editingId, input)
          : await createRegionAction(input);
        const current = regions.find(region => region.id === editingId);
        const nextRegion = { ...saved, _count: current?._count ?? emptyCounts };

        setRegions(items =>
          editingId
            ? items.map(item => (item.id === editingId ? nextRegion : item))
            : [...items, nextRegion].sort((a, b) =>
                a.name.localeCompare(b.name)
              )
        );
        setMessage(editingId ? "Région modifiée" : "Région créée");
        resetForm();
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };

  const remove = (region: Region) => {
    if (!window.confirm(`Supprimer la région ${region.name} ?`)) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        await deleteRegionAction(region.id);
        setRegions(items => items.filter(item => item.id !== region.id));
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
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Administration
        </p>
        <h1 className="mt-1 text-3xl font-bold">Régions du Niger</h1>
        <p className="mt-2 text-muted-foreground">
          Gérez les régions utilisées par les profils, candidatures et quotas.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold">
            {editingId ? "Modifier la région" : "Ajouter une région"}
          </h2>
          <label className="block space-y-2 text-sm font-medium">
            Nom
            <Input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Agadez"
              required
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Code
            <Input
              value={code}
              onChange={event => setCode(event.target.value.toUpperCase())}
              placeholder="AGD"
              required
              maxLength={10}
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Enregistrement..."
                : editingId
                  ? "Modifier"
                  : "Créer"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold">
              Régions enregistrées ({regions.length})
            </h2>
          </div>
          {message && (
            <p className="px-5 pt-4 text-sm text-green-600">{message}</p>
          )}
          {error && (
            <p className="px-5 pt-4 text-sm text-destructive">{error}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Nom</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Références</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {regions.map(region => {
                  const references = Object.values(region._count).reduce(
                    (total, count) => total + count,
                    0
                  );
                  return (
                    <tr key={region.id}>
                      <td className="px-5 py-3 font-medium">{region.name}</td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {region.code}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {references}
                      </td>
                      <td className="space-x-2 px-5 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(region.id);
                            setName(region.name);
                            setCode(region.code);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(region)}
                          disabled={isPending}
                        >
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

const emptyCounts = {
  userProfiles: 0,
  quotas: 0,
  applications: 0,
  eventApplications: 0,
  boardings: 0,
};
