"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Pencil, Search, Trash2 } from "lucide-react";
import { deleteNewsAction, listNewsAction } from "@/actions/news-actions";
import { NewsCreateDialog } from "@/components/admin/NewsCreateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  edition: { id: string; name: string; year: number } | null;
};

export function NewsManager({ news }: { news: NewsItem[] }) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(news);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? items.filter(item =>
          `${item.title} ${item.category ?? ""}`.toLowerCase().includes(query)
        )
      : items;
  }, [search, items]);

  const refreshAfterCreate = () => {
    startTransition(async () => {
      try {
        setItems(await listNewsAction());
        setMessage("Actualité créée avec succès.");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible de rafraîchir les actualités"
        );
      }
    });
  };

  const remove = (item: NewsItem) => {
    if (!window.confirm(`Supprimer l’actualité « ${item.title} » ?`)) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deleteNewsAction(item.id);
        setItems(current => current.filter(existing => existing.id !== item.id));
        setMessage("Actualité supprimée");
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
            Contenus
          </p>
          <h1 className="mt-1 text-3xl font-bold">Actualités</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez les actualités affichées sur le site public de la JNJL.
          </p>
        </div>
        <NewsCreateDialog onCreated={refreshAfterCreate} />
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liste des actualités</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} actualité{filtered.length !== 1 ? "s" : ""}
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Titre</th>
                <th className="px-5 py-4">Catégorie</th>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(item => (
                <tr key={item.id} className="group transition-colors hover:bg-muted/50">
                  <td className="px-5 py-4">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">/{item.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.category || "—"}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.edition ? `${item.edition.name} (${item.edition.year})` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.isPublished ? "Publiée" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {item.isPublished && (
                        <Button
                          size="icon"
                          variant="outline"
                          title="Voir sur le site"
                          nativeButton={false}
                          className="hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                          render={<Link href={`/actualites/${item.slug}`} target="_blank" />}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="outline"
                        title="Modifier"
                        nativeButton={false}
                        className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                        render={<Link href={`/admin/actualites/${item.id}/edit`} />}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title="Supprimer"
                        onClick={() => remove(item)}
                        disabled={isPending}
                        className="hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    Aucune actualité trouvée.
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
