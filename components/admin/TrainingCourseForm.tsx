"use client";

import { useState, useTransition } from "react";
import {
  createTrainingCourseAction,
  updateTrainingCourseAction,
} from "@/actions/training-actions";
import type { TrainingCourseInput } from "@/schemas/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };

type CourseItem = {
  id: string;
  editionId: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  hasCertificate: boolean;
};

export function TrainingCourseForm({
  course,
  editions,
  onSuccess,
  onCancel,
}: {
  course?: CourseItem;
  editions: EditionOption[];
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<TrainingCourseInput>(
    course
      ? {
          editionId: course.editionId,
          title: course.title,
          description: course.description ?? "",
          isRequired: course.isRequired,
          hasCertificate: course.hasCertificate,
        }
      : {
          editionId: editions[0]?.id ?? "",
          title: "",
          description: "",
          isRequired: true,
          hasCertificate: true,
        }
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof TrainingCourseInput>(field: K, value: TrainingCourseInput[K]) =>
    setForm(current => ({ ...current, [field]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (course) {
          await updateTrainingCourseAction(course.id, form);
        } else {
          await createTrainingCourseAction(form);
        }
        onSuccess();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <Field>
        <FieldLabel>Édition</FieldLabel>
        <Select
          value={form.editionId}
          disabled={!!course}
          onValueChange={value => value && update("editionId", value as string)}
        >
          <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
            <SelectValue placeholder="Choisir une édition">
              {(value: string) => {
                const edition = editions.find(item => item.id === value);
                return edition ? `${edition.name} (${edition.year})` : "Choisir une édition";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {editions.map(edition => (
              <SelectItem key={edition.id} value={edition.id}>
                {edition.name} ({edition.year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Titre de la formation</FieldLabel>
        <Input
          value={form.title}
          onChange={event => update("title", event.target.value)}
          required
          placeholder="Leadership et engagement citoyen"
          className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <Field>
        <FieldLabel>Description (optionnel)</FieldLabel>
        <Textarea
          value={form.description}
          onChange={event => update("description", event.target.value)}
          className="min-h-[90px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Obligatoire pour le parcours</p>
            <p className="text-xs text-muted-foreground">
              Doit être terminée avant le QCM de classement des ambassadeurs.
            </p>
          </div>
          <Switch checked={form.isRequired} onCheckedChange={checked => update("isRequired", checked)} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Délivre une attestation</p>
            <p className="text-xs text-muted-foreground">
              Éligible une fois la formation terminée et le(s) QCM lié(s) réussi(s).
            </p>
          </div>
          <Switch
            checked={form.hasCertificate}
            onCheckedChange={checked => update("hasCertificate", checked)}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          loading={isPending}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending ? "Enregistrement..." : course ? "Enregistrer" : "Créer la formation"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="cancel"
            onClick={onCancel}
          >
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
