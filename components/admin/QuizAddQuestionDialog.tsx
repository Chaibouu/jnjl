"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addQuestionToQuizAction } from "@/actions/quiz-actions";

type Question = {
  id: string;
  text: string;
  points: number;
  category: { id: string; name: string };
};

export function QuizAddQuestionDialog({
  open,
  onOpenChange,
  quizId,
  availableQuestions,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  availableQuestions: Question[];
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? availableQuestions.filter(question => question.text.toLowerCase().includes(query))
      : availableQuestions;
  }, [search, availableQuestions]);

  const add = (questionId: string) => {
    setError("");
    setAddingId(questionId);
    startTransition(async () => {
      try {
        await addQuestionToQuizAction(quizId, questionId);
        onAdded();
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      } finally {
        setAddingId(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} closeOnOutsideClick={false}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajouter depuis la banque</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 rounded-none border border-border bg-muted/40 pl-9 transition-colors focus-visible:border-ring focus-visible:bg-white"
            placeholder="Rechercher une question..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filtered.map(question => (
            <div
              key={question.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium">{question.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {question.category.name} — {question.points} pt{question.points > 1 ? "s" : ""}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={addingId === question.id}
                onClick={() => add(question.id)}
                className="shrink-0 hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune question disponible à ajouter.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
