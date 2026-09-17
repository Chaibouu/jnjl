"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deletePartnerAction, listPartnersAction } from "@/actions/partner-actions";
import { PartnerDialog } from "@/components/admin/PartnerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import charter from "@/settings/charter";

const CATEGORY_LABEL: Record<string, string> = {
  INSTITUTIONNEL: "Institutionnel",
  TECHNIQUE: "Technique",
  FINANCIER: "Financier",
  MEDIA: "Média",
  AUTRE: "Autre",
};

type Partner = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  editions: {
    editionId: string;
    category: string;
    edition: { id: string; name: string; year: number };
  }[];
};

type EditionOption = { id: string; name: string; year: number };

export function PartnerManager({
  partners,
  editions,
}: {
  partners: Partner[];
  editions: EditionOption[];
}) {
  const [items, setItems] = useState(partners);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? items.filter(item => item.name.toLowerCase().includes(query))
      : items;
  }, [search, items]);

  const openCreate = () => {
    setMessage("");
    setError("");
    setEditingPartner(null);
    setDialogOpen(true);
  };

  const openEdit = (partner: Partner) => {
    setMessage("");
    setError("");
    setEditingPartner(partner);
    setDialogOpen(true);
  };

  const refresh = (successMessage: string) => {
    startTransition(async () => {
      try {
        setItems(await listPartnersAction());
        setMessage(successMessage);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible de rafraîchir les partenaires"
        );
      }
    });
  };

  const remove = (partner: Partner) => {
    if (!window.confirm(`Supprimer le partenaire ${partner.name} ?`)) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deletePartnerAction(partner.id);
        setItems(current => current.filter(item => item.id !== partner.id));
        setMessage("Partenaire supprimé");
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
          <h1 className="mt-1 text-3xl font-bold">Partenaires</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez les partenaires affichés sur le site public, par édition.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un partenaire
        </Button>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liste des partenaires</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} partenaire{filtered.length !== 1 ? "s" : ""}
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
                <th className="px-5 py-4">Partenaire</th>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4">Catégorie</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(partner => {
                const link = partner.editions[0];
                return (
                  <tr key={partner.id} className="group transition-colors hover:bg-muted/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {partner.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={partner.logoUrl} alt={partner.name} className="h-full w-full object-cover" />
                          ) : (
                            partner.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <p className="font-medium">{partner.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {link ? `${link.edition.name} (${link.edition.year})` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {link ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                          {CATEGORY_LABEL[link.category] ?? link.category}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Modifier"
                          onClick={() => openEdit(partner)}
                          className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="Supprimer"
                          onClick={() => remove(partner)}
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
                    Aucun partenaire trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PartnerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        partner={editingPartner}
        editions={editions}
        onSaved={() =>
          refresh(editingPartner ? "Partenaire modifié" : "Partenaire créé")
        }
      />
    </section>
  );
}
