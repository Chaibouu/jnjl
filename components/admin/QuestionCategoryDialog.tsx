"use client";

import { useEffect, useState, useTransition } from "react";
import { FolderTree } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  createQuestionCategoryAction,
  updateQuestionCategoryAction,
} from "@/actions/question-category-actions";
import charter from "@/settings/charter";

type Category = { id: string; name: string; description: string | null };

export function QuestionCategoryDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setDescription(category?.description ?? "");
      setError("");
    }
  }, [open, category]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const input = { name, description };
        if (category) {
          await updateQuestionCategoryAction(category.id, input);
        } else {
          await createQuestionCategoryAction(input);
        }
        onSaved();
        onOpenChange(false);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} closeOnOutsideClick={false}>
      <DialogContent className="rounded-none">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderTree className="h-4 w-4" />
              </span>
              <DialogTitle>
                {category ? "Modifier la catégorie" : "Ajouter une catégorie"}
              </DialogTitle>
            </div>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
          <Field>
            <FieldLabel>Nom</FieldLabel>
            <Input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Leadership"
              required
              autoFocus
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <Field>
            <FieldLabel>Description (optionnel)</FieldLabel>
            <Textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              className="min-h-[70px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <DialogFooter className="rounded-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-red-500 text-red-600 hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              {isPending ? "Enregistrement..." : category ? "Enregistrer" : "Créer la catégorie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
