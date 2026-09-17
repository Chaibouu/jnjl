"use client";

import { useState, useTransition } from "react";
import { createQuizAction, updateQuizAction } from "@/actions/quiz-actions";
import type { QuizInput } from "@/schemas/quiz";
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

type QuizItem = {
  id: string;
  editionId: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showScore: boolean;
  showCorrectAnswers: boolean;
};

export function QuizForm({
  quiz,
  editions,
  onSuccess,
  onCancel,
}: {
  quiz?: QuizItem;
  editions: EditionOption[];
  onSuccess: (quizId: string) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<QuizInput>(
    quiz
      ? {
          editionId: quiz.editionId,
          title: quiz.title,
          description: quiz.description ?? "",
          durationMinutes: quiz.durationMinutes ?? "",
          passingScore: quiz.passingScore,
          maxAttempts: quiz.maxAttempts,
          shuffleQuestions: quiz.shuffleQuestions,
          shuffleOptions: quiz.shuffleOptions,
          showScore: quiz.showScore,
          showCorrectAnswers: quiz.showCorrectAnswers,
        }
      : {
          editionId: editions[0]?.id ?? "",
          title: "",
          description: "",
          durationMinutes: "",
          passingScore: 70,
          maxAttempts: 1,
          shuffleQuestions: false,
          shuffleOptions: false,
          showScore: true,
          showCorrectAnswers: false,
        }
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof QuizInput>(field: K, value: QuizInput[K]) =>
    setForm(current => ({ ...current, [field]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const saved = quiz
          ? await updateQuizAction(quiz.id, form)
          : await createQuizAction(form);
        onSuccess(saved.id);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel>Titre</FieldLabel>
          <Input
            value={form.title}
            onChange={event => update("title", event.target.value)}
            required
            placeholder="Évaluation Formation Ambassadeurs 2026"
            className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>Édition</FieldLabel>
          <Select value={form.editionId} onValueChange={value => update("editionId", value as string)}>
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
      </div>

      <Field>
        <FieldLabel>Description (optionnel)</FieldLabel>
        <Textarea
          value={form.description}
          onChange={event => update("description", event.target.value)}
          className="min-h-[70px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel>Durée (minutes)</FieldLabel>
          <Input
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={event => update("durationMinutes", event.target.value as never)}
            placeholder="20"
            className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
          />
        </Field>
        <Field>
          <FieldLabel>Score minimum (%)</FieldLabel>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.passingScore}
            onChange={event => update("passingScore", Number(event.target.value) as never)}
            className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
          />
        </Field>
        <Field>
          <FieldLabel>Tentatives autorisées</FieldLabel>
          <Input
            type="number"
            min={1}
            max={10}
            value={form.maxAttempts}
            onChange={event => update("maxAttempts", Number(event.target.value) as never)}
            className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow
          label="Mélanger les questions"
          checked={form.shuffleQuestions}
          onChange={checked => update("shuffleQuestions", checked)}
        />
        <ToggleRow
          label="Mélanger les réponses"
          checked={form.shuffleOptions}
          onChange={checked => update("shuffleOptions", checked)}
        />
        <ToggleRow
          label="Afficher le score au candidat"
          checked={form.showScore}
          onChange={checked => update("showScore", checked)}
        />
        <ToggleRow
          label="Afficher les corrections"
          checked={form.showCorrectAnswers}
          onChange={checked => update("showCorrectAnswers", checked)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending ? "Enregistrement..." : quiz ? "Enregistrer" : "Créer le QCM"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-red-500 text-red-600 hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
          >
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
