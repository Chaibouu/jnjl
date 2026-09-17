"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteSpeakerAction, listSpeakersAction } from "@/actions/speaker-actions";
import { SpeakerDialog } from "@/components/admin/SpeakerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import charter from "@/settings/charter";

type Speaker = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  role: string | null;
  organization: string | null;
  bio: string | null;
  editions: {
    editionId: string;
    edition: { id: string; name: string; year: number };
  }[];
};

type EditionOption = { id: string; name: string; year: number };

export function SpeakerManager({
  speakers,
  editions,
}: {
  speakers: Speaker[];
  editions: EditionOption[];
}) {
  const [items, setItems] = useState(speakers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? items.filter(item =>
          `${item.firstName} ${item.lastName} ${item.organization ?? ""}`
            .toLowerCase()
            .includes(query)
        )
      : items;
  }, [search, items]);

  const openCreate = () => {
    setMessage("");
    setError("");
    setEditingSpeaker(null);
    setDialogOpen(true);
  };

  const openEdit = (speaker: Speaker) => {
    setMessage("");
    setError("");
    setEditingSpeaker(speaker);
    setDialogOpen(true);
  };

  const refresh = (successMessage: string) => {
    startTransition(async () => {
      try {
        setItems(await listSpeakersAction());
        setMessage(successMessage);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible de rafraîchir les intervenants"
        );
      }
    });
  };

  const remove = (speaker: Speaker) => {
    if (!window.confirm(`Supprimer ${speaker.firstName} ${speaker.lastName} ?`)) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deleteSpeakerAction(speaker.id);
        setItems(current => current.filter(item => item.id !== speaker.id));
        setMessage("Intervenant supprimé");
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
          <h1 className="mt-1 text-3xl font-bold">Intervenants</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez les intervenants présentés sur le site public, par édition.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un intervenant
        </Button>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liste des intervenants</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} intervenant{filtered.length !== 1 ? "s" : ""}
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
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Intervenant</th>
                <th className="px-5 py-4">Fonction</th>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(speaker => {
                const link = speaker.editions[0];
                return (
                  <tr key={speaker.id} className="group transition-colors hover:bg-muted/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {speaker.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={speaker.photo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            `${speaker.firstName[0] ?? ""}${speaker.lastName[0] ?? ""}`.toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {speaker.firstName} {speaker.lastName}
                          </p>
                          {speaker.organization && (
                            <p className="text-xs text-muted-foreground">{speaker.organization}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{speaker.role || "—"}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {link ? `${link.edition.name} (${link.edition.year})` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Modifier"
                          onClick={() => openEdit(speaker)}
                          className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Supprimer"
                          onClick={() => remove(speaker)}
                          disabled={isPending}
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
                  <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                    Aucun intervenant trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SpeakerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        speaker={editingSpeaker}
        editions={editions}
        onSaved={() =>
          refresh(editingSpeaker ? "Intervenant modifié" : "Intervenant créé")
        }
      />
    </section>
  );
}
