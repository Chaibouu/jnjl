"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Check, Eye, Pencil, Search } from "lucide-react";
import { activateEditionAction, setEditionStatusAction } from "@/actions/edition-actions";
import { listEditionsAction } from "@/actions/edition-actions";
import { EditionCreateDialog } from "@/components/admin/EditionCreateDialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
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
  const { confirm } = useConfirm();

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

  const changeStatus = async (edition: EditionItem, status: "ARCHIVED" | "PUBLISHED") => {
    if (status === "ARCHIVED") {
      const confirmed = await confirm({
        title: `Archiver ${edition.name} ?`,
        description: "L'édition apparaîtra dans « Éditions précédentes » sur le site public.",
        confirmLabel: "Archiver",
      });
      if (!confirmed) return;
    }
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const updated = await setEditionStatusAction(edition.id, status);
        setItems(current =>
          current.map(item => (item.id === updated.id ? { ...item, status: updated.status } : item))
        );
        setMessage(
          status === "ARCHIVED" ? `${edition.name} est archivée.` : `${edition.name} est de nouveau publiée.`
        );
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Impossible de changer le statut");
      }
    });
  };

  const refreshAfterCreate = () => {
    startTransition(async () => {
      try {
        setItems(await listEditionsAction());
        setMessage("Édition créée avec succès.");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible de rafraîchir les éditions"
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
        <EditionCreateDialog onCreated={refreshAfterCreate} />
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
                  className="group transition-colors hover:bg-muted/50"
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
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        title="Voir"
                        nativeButton={false}
                        className="hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                        render={<Link href={`/admin/editions/${edition.id}`} />}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        title="Modifier"
                        nativeButton={false}
                        className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                        render={
                          <Link href={`/admin/editions/${edition.id}/edit`} />
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {edition.status !== "ACTIVE" && edition.status !== "ARCHIVED" && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Archiver cette édition"
                          onClick={() => changeStatus(edition, "ARCHIVED")}
                          disabled={isPending}
                          className="text-amber-600 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-500/10"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {edition.status === "ARCHIVED" && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Restaurer (publiée)"
                          onClick={() => changeStatus(edition, "PUBLISHED")}
                          disabled={isPending}
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      )}
                      {edition.status !== "ACTIVE" && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Activer cette édition"
                          onClick={() => activate(edition)}
                          disabled={isPending}
                          className="text-green-600 hover:border-green-500 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-500/10"
                        >
                          <Check className="h-4 w-4" />
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
