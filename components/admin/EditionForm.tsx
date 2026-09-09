"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createEditionAction, updateEditionAction } from "@/actions/edition-actions";
import type { EditionInput } from "@/schemas/edition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export function EditionForm({ edition }: { edition?: EditionItem }) {
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
        window.location.href = "/admin/editions";
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
      className="max-w-3xl space-y-6 rounded-xl border bg-card p-6 shadow-sm"
    >
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Année"
          type="number"
          value={form.year}
          onChange={value => update("year", value)}
          required
        />
        <Field
          label="Nom"
          value={form.name}
          onChange={handleNameChange}
          required
          placeholder="JNJL 2026"
        />
        <Field
          label="Slug"
          value={form.slug}
          onChange={value => {
            setSlugTouched(true);
            update("slug", slugify(value));
          }}
          required
          placeholder="jnjl-2026"
        />
        <Field
          label="Thème"
          value={form.theme}
          onChange={value => update("theme", value)}
        />
        <Field
          label="Lieu"
          value={form.location}
          onChange={value => update("location", value)}
          placeholder="Niamey"
        />
        <Field
          label="Date de début"
          type="date"
          value={form.startDate}
          onChange={value => update("startDate", value)}
        />
        <Field
          label="Date de fin"
          type="date"
          value={form.endDate}
          onChange={value => update("endDate", value)}
        />
      </div>
      <label className="block space-y-2 text-sm font-medium">
        Description
        <textarea
          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={form.description}
          onChange={event => update("description", event.target.value)}
        />
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Enregistrement..."
            : edition
              ? "Enregistrer"
              : "Créer l’édition"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/editions">Annuler</Link>
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      {label}
      <Input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}
