"use client";

import { useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { createProgramDayAction } from "@/actions/program-actions";
import charter from "@/settings/charter";

export function ProgramDayDialog({
  open,
  onOpenChange,
  editionId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editionId: string;
  onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createProgramDayAction({ editionId, date, title });
        setDate("");
        setTitle("");
        onSaved();
        onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange} closeOnOutsideClick={false}>
      <DialogContent className="rounded-none">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarPlus className="h-4 w-4" />
              </span>
              <DialogTitle>Ajouter un jour</DialogTitle>
            </div>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Field>
            <FieldLabel>Date</FieldLabel>
            <Input
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              required
              autoFocus
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <Field>
            <FieldLabel>Titre (optionnel)</FieldLabel>
            <Input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Jour 1 — Ouverture"
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
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
              {isPending ? "Enregistrement..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
