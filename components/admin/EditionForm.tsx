"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, Hash, MapPin } from "lucide-react";
import {
  createEditionAction,
  updateEditionAction,
} from "@/actions/edition-actions";
import type { EditionInput } from "@/schemas/edition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import charter from "@/settings/charter";

type EditionItem = {
  id: string;
  year: number;
  name: string;
  slug: string;
  theme: string | null;
  description: string | null;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

type EditionFormState = {
  year: string;
  name: string;
  slug: string;
  theme: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
};

const emptyForm: EditionFormState = {
  year: String(new Date().getFullYear()),
  name: "",
  slug: "",
  theme: "",
  description: "",
  location: "",
  startDate: "",
  endDate: "",
};

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export function EditionForm({
  edition,
  embedded = false,
  onSuccess,
  onCancel,
}: {
  edition?: EditionItem;
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<EditionFormState>(
    edition
      ? {
          year: String(edition.year),
          name: edition.name,
          slug: edition.slug,
          theme: edition.theme ?? "",
          description: edition.description ?? "",
          location: edition.location ?? "",
          startDate: toDateInputValue(edition.startDate),
          endDate: toDateInputValue(edition.endDate),
        }
      : emptyForm
  );
  // Une fois l'utilisateur intervenu manuellement sur le slug, on arrête de le
  // régénérer automatiquement à partir du nom (et en édition, on ne le régénère jamais).
  const [slugTouched, setSlugTouched] = useState(Boolean(edition));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const update = (field: keyof EditionFormState, value: string) =>
    setForm(current => ({ ...current, [field]: value }));

  const handleNameChange = (value: string) => {
    update("name", value);
    if (!slugTouched) {
      update("slug", slugify(value));
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const input: EditionInput = { ...form, year: Number(form.year) };
        if (edition) {
          await updateEditionAction(edition.id, input);
        } else {
          await createEditionAction(input);
        }
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/admin/editions";
        }
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
    <form
      onSubmit={submit}
      className={
        embedded
          ? "space-y-5"
          : "max-w-3xl space-y-5 rounded-xl border bg-card p-6 shadow-sm"
      }
    >
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="Année"
          type="number"
          value={form.year}
          onChange={value => update("year", value)}
          required
        />
        <FormField
          label="Nom"
          value={form.name}
          onChange={handleNameChange}
          required
          placeholder="JNJL 2026"
          className="sm:col-span-2"
        />
        <FormField
          label="Slug"
          value={form.slug}
          onChange={value => {
            setSlugTouched(true);
            update("slug", slugify(value));
          }}
          required
          placeholder="jnjl-2026"
          icon={Hash}
          monospace
          className="sm:col-span-2"
        />
        <FormField
          label="Thème"
          value={form.theme}
          onChange={value => update("theme", value)}
          placeholder="Leadership et engagement citoyen"
        />
        <FormField
          label="Lieu"
          value={form.location}
          onChange={value => update("location", value)}
          placeholder="Niamey"
          icon={MapPin}
        />
        <FormField
          label="Date de début"
          type="date"
          value={form.startDate}
          onChange={value => update("startDate", value)}
          icon={Calendar}
        />
        <FormField
          label="Date de fin"
          type="date"
          value={form.endDate}
          onChange={value => update("endDate", value)}
          icon={Calendar}
        />
      </div>

      <Field>
        <FieldLabel>Description</FieldLabel>
        <Textarea
          className="min-h-[120px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
          placeholder="Présentez le thème, les objectifs et les temps forts de cette édition..."
          value={form.description}
          onChange={event => update("description", event.target.value)}
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending
            ? "Enregistrement..."
            : edition
              ? "Enregistrer"
              : "Créer l’édition"}
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
            href="/admin/editions"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-red-500 bg-background px-2.5 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
          >
            Annuler
          </Link>
        )}
      </div>
    </form>
  );
}

// Compose Field.Root + Field.Label (Base UI) avec notre <Input> déjà stylé —
// https://base-ui.com/react/components/field : "You can omit [Field.Control]
// and use any Base UI input component instead. For example, Input... will
// work with Field out of the box." Ça garantit le lien label/champ accessible
// sans dupliquer la logique de rendu d'un <input>.
function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  icon: Icon,
  monospace = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  monospace?: boolean;
  className?: string;
}) {
  return (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          type={type}
          value={value}
          onChange={event => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          className={`h-11 rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white ${Icon ? "pl-9" : "px-3.5"} ${monospace ? "font-mono" : ""}`}
        />
      </div>
    </Field>
  );
}
