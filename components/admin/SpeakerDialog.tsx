"use client";

import { useEffect, useState, useTransition } from "react";
import { Mic } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import {
  createSpeakerAction,
  updateSpeakerAction,
} from "@/actions/speaker-actions";
import type { SpeakerInput } from "@/schemas/speaker";
import charter from "@/settings/charter";

type Speaker = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  role: string | null;
  organization: string | null;
  bio: string | null;
  editions: { editionId: string }[];
};

type EditionOption = { id: string; name: string; year: number };

export function SpeakerDialog({
  open,
  onOpenChange,
  speaker,
  editions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  speaker: Speaker | null;
  editions: EditionOption[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SpeakerInput>(emptyForm(speaker));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(emptyForm(speaker));
      setError("");
    }
  }, [open, speaker]);

  const update = <K extends keyof SpeakerInput>(field: K, value: SpeakerInput[K]) =>
    setForm(current => ({ ...current, [field]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (speaker) {
          await updateSpeakerAction(speaker.id, form);
        } else {
          await createSpeakerAction(form);
        }
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
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mic className="h-4 w-4" />
              </span>
              <DialogTitle>
                {speaker ? "Modifier l’intervenant" : "Ajouter un intervenant"}
              </DialogTitle>
            </div>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Prénom</FieldLabel>
              <Input
                value={form.firstName}
                onChange={event => update("firstName", event.target.value)}
                required
                autoFocus
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
            <Field>
              <FieldLabel>Nom</FieldLabel>
              <Input
                value={form.lastName}
                onChange={event => update("lastName", event.target.value)}
                required
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
          </div>
          <MediaUploadField
            label="Photo"
            kind="speakerPhoto"
            value={form.photo}
            onChange={value => update("photo", value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Fonction</FieldLabel>
              <Input
                value={form.role}
                onChange={event => update("role", event.target.value)}
                placeholder="Directeur général"
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
            <Field>
              <FieldLabel>Organisation</FieldLabel>
              <Input
                value={form.organization}
                onChange={event => update("organization", event.target.value)}
                placeholder="Ministère de la Jeunesse"
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Biographie</FieldLabel>
            <Textarea
              value={form.bio}
              onChange={event => update("bio", event.target.value)}
              className="min-h-[90px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <Field>
            <FieldLabel>Édition</FieldLabel>
            <Select
              value={form.editionId || null}
              onValueChange={value => update("editionId", (value as string) ?? "")}
            >
              <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
                <SelectValue placeholder="Aucune">
                  {(value: string | null) => {
                    const edition = editions.find(item => item.id === value);
                    return edition ? `${edition.name} (${edition.year})` : "Aucune";
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
          <DialogFooter className="rounded-none">
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              loading={isPending}
              className="text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              {isPending
                ? "Enregistrement..."
                : speaker
                  ? "Enregistrer"
                  : "Créer l’intervenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(speaker: Speaker | null): SpeakerInput {
  return {
    firstName: speaker?.firstName ?? "",
    lastName: speaker?.lastName ?? "",
    photo: speaker?.photo ?? "",
    role: speaker?.role ?? "",
    organization: speaker?.organization ?? "",
    bio: speaker?.bio ?? "",
    editionId: speaker?.editions[0]?.editionId ?? "",
  };
}
