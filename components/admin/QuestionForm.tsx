"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { createQuestionAction, updateQuestionAction } from "@/actions/question-actions";
import { questionTypes, type QuestionInput } from "@/schemas/question";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

const TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: "Choix unique",
  MULTIPLE_CHOICE: "Choix multiple",
  TRUE_FALSE: "Vrai / Faux",
};

type Category = { id: string; name: string };

type QuestionItem = {
  id: string;
  categoryId: string;
  type: string;
  text: string;
  explanation: string | null;
  points: number;
  isActive: boolean;
  options: { text: string; isCorrect: boolean }[];
};

export function QuestionForm({
  question,
  categories,
  embedded = false,
  onSuccess,
  onCancel,
}: {
  question?: QuestionItem;
  categories: Category[];
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<QuestionInput>(
    question
      ? {
          categoryId: question.categoryId,
          type: question.type as QuestionInput["type"],
          text: question.text,
          explanation: question.explanation ?? "",
          points: question.points,
          isActive: question.isActive,
          options: question.options.map(option => ({ ...option })),
        }
      : {
          categoryId: categories[0]?.id ?? "",
          type: "SINGLE_CHOICE",
          text: "",
          explanation: "",
          points: 1,
          isActive: true,
          options: [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ],
        }
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof QuestionInput>(field: K, value: QuestionInput[K]) =>
    setForm(current => ({ ...current, [field]: value }));

  const setOptionText = (index: number, text: string) =>
    setForm(current => ({
      ...current,
      options: current.options.map((option, i) => (i === index ? { ...option, text } : option)),
    }));

  const toggleCorrect = (index: number) =>
    setForm(current => ({
      ...current,
      options: current.options.map((option, i) => {
        if (current.type === "MULTIPLE_CHOICE") {
          return i === index ? { ...option, isCorrect: !option.isCorrect } : option;
        }
        return { ...option, isCorrect: i === index };
      }),
    }));

  const addOption = () =>
    setForm(current => ({ ...current, options: [...current.options, { text: "", isCorrect: false }] }));

  const removeOption = (index: number) =>
    setForm(current => ({
      ...current,
      options: current.options.filter((_, i) => i !== index),
    }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (question) {
          await updateQuestionAction(question.id, form);
        } else {
          await createQuestionAction(form);
        }
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/admin/qcm/questions";
        }
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className={
        embedded
          ? "space-y-5"
          : "max-w-3xl space-y-5 rounded-xl border bg-card p-6 shadow-sm"
      }
    >
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field className="sm:col-span-2">
          <FieldLabel>Catégorie</FieldLabel>
          <Select value={form.categoryId} onValueChange={value => update("categoryId", value as string)}>
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir une catégorie">
                {(value: string) => categories.find(category => category.id === value)?.name ?? "Choisir"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Points</FieldLabel>
          <Input
            type="number"
            min={1}
            value={form.points}
            onChange={event => update("points", Number(event.target.value) as never)}
            className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel>Type de question</FieldLabel>
        <Select
          value={form.type}
          onValueChange={value => update("type", value as QuestionInput["type"])}
        >
          <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
            <SelectValue>{(value: string) => TYPE_LABEL[value] ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {questionTypes.map(type => (
              <SelectItem key={type} value={type}>
                {TYPE_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Question</FieldLabel>
        <Textarea
          value={form.text}
          onChange={event => update("text", event.target.value)}
          required
          placeholder="Quel est le rôle principal d'un ambassadeur JNJL ?"
          className="min-h-[80px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="block text-sm font-medium">Réponses</p>
          <p className="text-xs text-muted-foreground">
            {form.type === "MULTIPLE_CHOICE"
              ? "Cochez toutes les bonnes réponses"
              : "Cochez la bonne réponse"}
          </p>
        </div>
        {form.options.map((option, index) => (
          <div key={index} className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Checkbox checked={option.isCorrect} onCheckedChange={() => toggleCorrect(index)} />
            <Input
              value={option.text}
              onChange={event => setOptionText(index, event.target.value)}
              placeholder={`Réponse ${index + 1}`}
              required
              className="h-11 flex-1 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
            {form.options.length > 2 && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => removeOption(index)}
                className="hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          className="rounded-none"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Ajouter une réponse
        </Button>
      </div>

      <Field>
        <FieldLabel>Explication (optionnel)</FieldLabel>
        <Textarea
          value={form.explanation}
          onChange={event => update("explanation", event.target.value)}
          placeholder="Affichée après correction si le QCM le permet..."
          className="min-h-[60px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Question active</p>
          <p className="text-xs text-muted-foreground">
            Une question inactive n&apos;apparaît plus dans la banque pour un nouveau QCM.
          </p>
        </div>
        <Switch checked={form.isActive} onCheckedChange={checked => update("isActive", checked)} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending ? "Enregistrement..." : question ? "Enregistrer" : "Créer la question"}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-red-500 text-red-600 hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
          >
            Annuler
          </Button>
        ) : (
          <Link
            href="/admin/qcm/questions"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-red-500 bg-background px-2.5 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
          >
            Annuler
          </Link>
        )}
      </div>
    </form>
  );
}
