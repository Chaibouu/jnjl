"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  deleteQuestionCategoryAction,
  listQuestionCategoriesAction,
} from "@/actions/question-category-actions";
import { QuestionCategoryDialog } from "@/components/admin/QuestionCategoryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import charter from "@/settings/charter";

type Category = {
  id: string;
  name: string;
  description: string | null;
  _count: { questions: number };
};

export function QuestionCategoryManager({ categories }: { categories: Category[] }) {
  const [items, setItems] = useState(categories);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? items.filter(item => item.name.toLowerCase().includes(query)) : items;
  }, [search, items]);

  const openCreate = () => {
    setMessage("");
    setError("");
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setMessage("");
    setError("");
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const refresh = (successMessage: string) => {
    startTransition(async () => {
      try {
        setItems(await listQuestionCategoriesAction());
        setMessage(successMessage);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible de rafraîchir les catégories"
        );
      }
    });
  };

  const remove = (category: Category) => {
    if (!window.confirm(`Supprimer la catégorie ${category.name} ?`)) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deleteQuestionCategoryAction(category.id);
        setItems(current => current.filter(item => item.id !== category.id));
        setMessage("Catégorie supprimée");
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">QCM</p>
          <h1 className="mt-1 text-3xl font-bold">Catégories de questions</h1>
          <p className="mt-2 text-muted-foreground">
            Organisez la banque de questions par thème pour composer vos QCM plus facilement.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une catégorie
        </Button>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Catégories</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} catégorie{filtered.length !== 1 ? "s" : ""}
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
        {error && <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Catégorie</th>
                <th className="px-5 py-4">Questions</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(category => (
                <tr key={category.id} className="group transition-colors hover:bg-muted/50">
                  <td className="px-5 py-4">
                    <p className="font-medium">{category.name}</p>
                    {category.description && (
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {category._count.questions} question{category._count.questions !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title="Modifier"
                        onClick={() => openEdit(category)}
                        className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title={
                          category._count.questions > 0
                            ? "Catégorie utilisée — suppression impossible"
                            : "Supprimer"
                        }
                        onClick={() => remove(category)}
                        disabled={isPending || category._count.questions > 0}
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
                  <td colSpan={3} className="px-5 py-12 text-center text-muted-foreground">
                    Aucune catégorie trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuestionCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        onSaved={() => refresh(editingCategory ? "Catégorie modifiée" : "Catégorie créée")}
      />
    </section>
  );
}
