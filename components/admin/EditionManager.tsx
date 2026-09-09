"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Eye, Pencil, Plus, Search } from "lucide-react";
import { activateEditionAction } from "@/actions/edition-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditionItem = {
  id: string;
  year: number;
  name: string;
  slug: string;
  theme: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  ACTIVE: "Active",
  ARCHIVED: "Archivée",
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

export function EditionManager({ editions }: { editions: EditionItem[] }) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(editions);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? items.filter(edition =>
          `${edition.name} ${edition.year} ${edition.slug}`
            .toLowerCase()
            .includes(query)
        )
      : items;
  }, [search, items]);

  const activate = (edition: EditionItem) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const activated = await activateEditionAction(edition.id);
        setItems(current =>
          current.map(item => ({
            ...item,
            status:
              item.id === activated.id
                ? "ACTIVE"
                : item.status === "ACTIVE"
                  ? "PUBLISHED"
                  : item.status,
          }))
        );
        setMessage(`${edition.name} est maintenant l’édition active.`);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible d’activer l’édition"
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
          <h1 className="mt-1 text-3xl font-bold">Éditions</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez les éditions de la JNJL, année par année.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/editions/create">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une édition
          </Link>
        </Button>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liste des éditions</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} édition{filtered.length !== 1 ? "s" : ""}
            </p>
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
        {message && (
          <p className="border-b px-5 py-3 text-sm text-green-600">{message}</p>
        )}
        {error && (
          <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4">Thème</th>
                <th className="px-5 py-4">Dates</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(edition => (
                <tr
                  key={edition.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium">{edition.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {edition.year} — /{edition.slug}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {edition.theme || "—"}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatRange(edition.startDate, edition.endDate)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[edition.status] ?? "bg-muted"}`}
                    >
                      {STATUS_LABEL[edition.status] ?? edition.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" title="Voir">
                        <Link href={`/admin/editions/${edition.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        title="Modifier"
                      >
                        <Link href={`/admin/editions/${edition.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      {edition.status !== "ACTIVE" && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Activer cette édition"
                          onClick={() => activate(edition)}
                          disabled={isPending}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Aucune édition trouvée.
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

function formatRange(start: Date | null, end: Date | null) {
  if (!start && !end) return "—";
  const fmt = (value: Date) =>
    new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt((start ?? end) as Date);
}
