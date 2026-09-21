"use client";

import { useState, useTransition } from "react";
import {
  createTrainingModuleAction,
  updateTrainingModuleAction,
} from "@/actions/training-actions";
import type { TrainingModuleInput } from "@/schemas/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import charter from "@/settings/charter";

type CourseOption = { id: string; title: string; editionId: string; editionLabel: string };

type ModuleItem = {
  id: string;
  courseId: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
};

export function TrainingModuleForm({
  module,
  courses,
  defaultCourseId,
  onSuccess,
  onCancel,
}: {
  module?: ModuleItem;
  courses: CourseOption[];
  defaultCourseId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<TrainingModuleInput>(
    module
      ? {
          courseId: module.courseId,
          title: module.title,
          content: module.content ?? "",
          videoUrl: module.videoUrl ?? "",
        }
      : {
          courseId: defaultCourseId ?? courses[0]?.id ?? "",
          title: "",
          content: "",
          videoUrl: "",
        }
  );
  // Un module ne peut changer de formation qu'au sein de sa propre édition.
  const currentCourse = courses.find(course => course.id === form.courseId);
  const selectableCourses = module
    ? courses.filter(course => course.editionId === currentCourse?.editionId)
    : courses;
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof TrainingModuleInput>(
    field: K,
    value: TrainingModuleInput[K]
  ) => setForm(current => ({ ...current, [field]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (module) {
          await updateTrainingModuleAction(module.id, form);
        } else {
          await createTrainingModuleAction(form);
        }
        onSuccess();
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

      <Field>
        <FieldLabel>Formation</FieldLabel>
        <Select
          value={form.courseId}
          onValueChange={value => value && update("courseId", value as string)}
        >
          <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
            <SelectValue placeholder="Choisir une formation">
              {(value: string) => {
                const course = courses.find(item => item.id === value);
                return course ? `${course.title} — ${course.editionLabel}` : "Choisir une formation";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {selectableCourses.map(course => (
              <SelectItem key={course.id} value={course.id}>
                {course.title} — {course.editionLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Titre</FieldLabel>
        <Input
          value={form.title}
          onChange={event => update("title", event.target.value)}
          required
          placeholder="Introduction au leadership"
          className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <Field>
        <FieldLabel>URL de la vidéo (optionnel)</FieldLabel>
        <Input
          value={form.videoUrl}
          onChange={event => update("videoUrl", event.target.value)}
          placeholder="https://..."
          className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <Field>
        <FieldLabel>Contenu (optionnel)</FieldLabel>
        <RichTextEditor
          key={module?.id ?? "new"}
          value={form.content ?? ""}
          onChange={html => update("content", html)}
          placeholder="Support de formation : titres, listes, images, tableaux, vidéo…"
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          loading={isPending}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending ? "Enregistrement..." : module ? "Enregistrer" : "Créer le module"}
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
