"use client";

import { useEffect, useState, useTransition } from "react";
import { Handshake } from "lucide-react";
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
import {
  createPartnerAction,
  updatePartnerAction,
} from "@/actions/partner-actions";
import { partnerCategories, type PartnerInput } from "@/schemas/partner";
import charter from "@/settings/charter";

const CATEGORY_LABEL: Record<string, string> = {
  INSTITUTIONNEL: "Institutionnel",
  TECHNIQUE: "Technique",
  FINANCIER: "Financier",
  MEDIA: "Média",
  AUTRE: "Autre",
};

type Partner = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  editions: { editionId: string; category: string }[];
};

type EditionOption = { id: string; name: string; year: number };

export function PartnerDialog({
  open,
  onOpenChange,
  partner,
  editions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner | null;
  editions: EditionOption[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PartnerInput>(emptyForm(partner));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(emptyForm(partner));
      setError("");
    }
  }, [open, partner]);

  const update = <K extends keyof PartnerInput>(field: K, value: PartnerInput[K]) =>
    setForm(current => ({ ...current, [field]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (partner) {
          await updatePartnerAction(partner.id, form);
        } else {
          await createPartnerAction(form);
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
                <Handshake className="h-4 w-4" />
              </span>
              <DialogTitle>
                {partner ? "Modifier le partenaire" : "Ajouter un partenaire"}
              </DialogTitle>
            </div>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Field>
            <FieldLabel>Nom</FieldLabel>
            <Input
              value={form.name}
              onChange={event => update("name", event.target.value)}
              placeholder="Ministère de la Jeunesse"
              required
              autoFocus
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <Field>
            <FieldLabel>Logo (URL)</FieldLabel>
            <Input
              value={form.logoUrl}
              onChange={event => update("logoUrl", event.target.value)}
              placeholder="https://..."
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <Field>
            <FieldLabel>Site web</FieldLabel>
            <Input
              value={form.website}
              onChange={event => update("website", event.target.value)}
              placeholder="https://..."
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={form.description}
              onChange={event => update("description", event.target.value)}
              className="min-h-[80px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field>
              <FieldLabel>Catégorie</FieldLabel>
              <Select
                value={form.category}
                onValueChange={value => update("category", value as PartnerInput["category"])}
              >
                <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
                  <SelectValue>
                    {(value: string) => CATEGORY_LABEL[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {partnerCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_LABEL[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
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
                : partner
                  ? "Enregistrer"
                  : "Créer le partenaire"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(partner: Partner | null): PartnerInput {
  const link = partner?.editions[0];
  return {
    name: partner?.name ?? "",
    logoUrl: partner?.logoUrl ?? "",
    description: partner?.description ?? "",
    website: partner?.website ?? "",
    editionId: link?.editionId ?? "",
    category: (link?.category as PartnerInput["category"]) ?? "AUTRE",
  };
}
