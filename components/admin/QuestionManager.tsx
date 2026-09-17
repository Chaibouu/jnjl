"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Search, Trash2 } from "lucide-react";
import { deleteQuestionAction, listQuestionsAction } from "@/actions/question-actions";
import { QuestionCreateDialog } from "@/components/admin/QuestionCreateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: "Choix unique",
  MULTIPLE_CHOICE: "Choix multiple",
  TRUE_FALSE: "Vrai / Faux",
};

type Question = {
  id: string;
  type: string;
  text: string;
  points: number;
  isActive: boolean;
  category: { id: string; name: string };
  _count: { quizQuestions: number };
};

type Category = { id: string; name: string };

export function QuestionManager({
  questions,
  categories,
}: {
  questions: Question[];
  categories: Category[];
}) {
  const [items, setItems] = useState(questions);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch = !query || item.text.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "ALL" || item.category.id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter, items]);

  const refresh = (successMessage: string) => {
    startTransition(async () => {
      try {
        setItems(await listQuestionsAction());
        setMessage(successMessage);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Impossible de rafraîchir les questions"
        );
      }
    });
  };

  const remove = (question: Question) => {
    if (!window.confirm("Supprimer cette question ?")) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deleteQuestionAction(question.id);
        setItems(current => current.filter(item => item.id !== question.id));
        setMessage("Question supprimée");
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
          <h1 className="mt-1 text-3xl font-bold">Banque de questions</h1>
          <p className="mt-2 text-muted-foreground">
            Créez vos questions une fois, réutilisez-les dans plusieurs QCM.
          </p>
        </div>
        <QuestionCreateDialog categories={categories} onCreated={() => refresh("Question créée")} />
      </header>

      {categories.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">
          Créez d&apos;abord une catégorie avant d&apos;ajouter des questions.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Questions</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} question{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={categoryFilter} onValueChange={value => setCategoryFilter(value as string)}>
              <SelectTrigger className="h-9 w-full rounded-none border border-border bg-muted/40 px-3.5 sm:w-52">
                <SelectValue>
                  {(value: string) =>
                    value === "ALL" ? "Toutes les catégories" : categories.find(c => c.id === value)?.name
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les catégories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Rechercher..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
        {message && <p className="border-b px-5 py-3 text-sm text-green-600">{message}</p>}
        {error && <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Question</th>
                <th className="px-5 py-4">Catégorie</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Points</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(question => (
                <tr key={question.id} className="group transition-colors hover:bg-muted/50">
                  <td className="px-5 py-4">
                    <p className="line-clamp-2 max-w-md font-medium">{question.text}</p>
                    {!question.isActive && (
                      <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{question.category.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{TYPE_LABEL[question.type] ?? question.type}</td>
                  <td className="px-5 py-4">{question.points}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        title="Modifier"
                        nativeButton={false}
                        className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                        render={<Link href={`/admin/qcm/questions/${question.id}/edit`} />}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        title={
                          question._count.quizQuestions > 0
                            ? "Utilisée dans un QCM — suppression impossible"
                            : "Supprimer"
                        }
                        onClick={() => remove(question)}
                        disabled={isPending || question._count.quizQuestions > 0}
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
                    Aucune question trouvée.
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
