"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Image as ImageIcon, Link2, Tag } from "lucide-react";
import { createNewsAction, updateNewsAction } from "@/actions/news-actions";
import type { NewsInput } from "@/schemas/news";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import charter from "@/settings/charter";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  coverImage: string | null;
  editionId: string | null;
  isPublished: boolean;
};

type NewsFormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  coverImage: string;
  editionId: string;
  isPublished: boolean;
};

const emptyForm: NewsFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  coverImage: "",
  editionId: "",
  isPublished: false,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export function NewsForm({
  news,
  embedded = false,
  onSuccess,
  onCancel,
}: {
  news?: NewsItem;
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<NewsFormState>(
    news
      ? {
          title: news.title,
          slug: news.slug,
          excerpt: news.excerpt ?? "",
          content: news.content,
          category: news.category ?? "",
          coverImage: news.coverImage ?? "",
          editionId: news.editionId ?? "",
          isPublished: news.isPublished,
        }
      : emptyForm
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(news));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof NewsFormState>(
    field: K,
    value: NewsFormState[K]
  ) => setForm(current => ({ ...current, [field]: value }));

  const handleTitleChange = (value: string) => {
    update("title", value);
    if (!slugTouched) {
      update("slug", slugify(value));
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const input: NewsInput = { ...form };
        if (news) {
          await updateNewsAction(news.id, input);
        } else {
          await createNewsAction(input);
        }
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/admin/actualites";
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel>Titre</FieldLabel>
          <Input
            value={form.title}
            onChange={event => handleTitleChange(event.target.value)}
            required
            placeholder="La JNJL 2026 ouvre ses candidatures"
            className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
          />
        </Field>
        <Field>
          <FieldLabel>Slug</FieldLabel>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={form.slug}
              onChange={event => {
                setSlugTouched(true);
                update("slug", slugify(event.target.value));
              }}
              required
              placeholder="jnjl-2026-ouverture"
              className="h-11 rounded-none border border-border bg-muted/40 pl-9 font-mono transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </div>
        </Field>
        <Field>
          <FieldLabel>Catégorie</FieldLabel>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={form.category}
              onChange={event => update("category", event.target.value)}
              placeholder="Annonce"
              className="h-11 rounded-none border border-border bg-muted/40 pl-9 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </div>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>Image de couverture (URL)</FieldLabel>
          <div className="relative">
            <ImageIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={form.coverImage}
              onChange={event => update("coverImage", event.target.value)}
              placeholder="https://..."
              className="h-11 rounded-none border border-border bg-muted/40 pl-9 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </div>
        </Field>
      </div>

      <Field>
        <FieldLabel>Extrait</FieldLabel>
        <Textarea
          className="min-h-[70px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
          placeholder="Résumé court affiché dans les listes d’actualités..."
          value={form.excerpt}
          onChange={event => update("excerpt", event.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel>Contenu</FieldLabel>
        <Textarea
          className="min-h-[220px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
          placeholder="Rédigez le corps de l’article..."
          value={form.content}
          onChange={event => update("content", event.target.value)}
          required
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Publier</p>
          <p className="text-xs text-muted-foreground">
            Une actualité publiée est visible sur le site public.
          </p>
        </div>
        <Switch
          checked={form.isPublished}
          onCheckedChange={checked => update("isPublished", checked)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending
            ? "Enregistrement..."
            : news
              ? "Enregistrer"
              : "Créer l’actualité"}
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
            href="/admin/actualites"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-red-500 bg-background px-2.5 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
          >
            Annuler
          </Link>
        )}
      </div>
    </form>
  );
}
