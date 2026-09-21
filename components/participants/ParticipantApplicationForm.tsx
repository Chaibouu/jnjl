"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENDER_OPTIONS, formatGender, type Gender } from "@/lib/gender";
import charter from "@/settings/charter";

const inputClass =
  "h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white";

type Region = { id: string; name: string; code: string };

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "" as "" | Gender,
  regionId: "",
  motivation: "",
  consent: false,
};

export function ParticipantApplicationForm({
  regions,
  hasActiveEdition,
}: {
  regions: Region[];
  hasActiveEdition: boolean;
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm(current => ({ ...current, [field]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!form.gender) {
      setError("Veuillez choisir votre sexe (Masculin ou Féminin).");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/applications/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Impossible d'enregistrer la candidature");
        }
        setForm(emptyForm);
        setSent(true);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue, veuillez réessayer."
        );
      }
    });
  };

  if (!hasActiveEdition) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center shadow-sm" style={{ borderColor: charter.border }}>
        <p className="text-sm" style={{ color: charter.inkSoft }}>
          Aucune édition n&apos;accepte actuellement les candidatures. Revenez bientôt !
        </p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-white p-10 text-center shadow-sm" style={{ borderColor: charter.border }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${charter.orange}15` }}>
          <CheckCircle2 className="h-6 w-6" style={{ color: charter.orange }} />
        </div>
        <h3 className="mt-4 text-lg font-bold" style={{ color: charter.ink }}>
          Candidature envoyée
        </h3>
        <p className="mt-2 max-w-sm text-sm" style={{ color: charter.inkSoft }}>
          Merci ! Votre demande de participation a bien été enregistrée. L&apos;équipe JNJL
          l&apos;examinera prochainement.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
      style={{ borderColor: charter.border }}
    >
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Prénom</FieldLabel>
          <Input
            value={form.firstName}
            onChange={event => update("firstName", event.target.value)}
            required
            placeholder="Votre prénom"
            className={inputClass}
          />
        </Field>
        <Field>
          <FieldLabel>Nom</FieldLabel>
          <Input
            value={form.lastName}
            onChange={event => update("lastName", event.target.value)}
            required
            placeholder="Votre nom"
            className={inputClass}
          />
        </Field>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={form.email}
            onChange={event => update("email", event.target.value)}
            required
            placeholder="vous@exemple.com"
            className={inputClass}
          />
        </Field>
        <Field>
          <FieldLabel>Téléphone</FieldLabel>
          <Input
            type="tel"
            value={form.phone}
            onChange={event => update("phone", event.target.value)}
            required
            placeholder="+227 00 00 00 00"
            className={inputClass}
          />
        </Field>
        <Field>
          <FieldLabel>Sexe</FieldLabel>
          <Select value={form.gender} onValueChange={value => update("gender", value as Gender)}>
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir">
                {(value: string) => formatGender(value) === "—" ? "Choisir" : formatGender(value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field>
        <FieldLabel>Région (optionnel)</FieldLabel>
        <Select value={form.regionId} onValueChange={value => update("regionId", value as string)}>
          <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
            <SelectValue placeholder="Choisir votre région">
              {(value: string) => {
                const region = regions.find(item => item.id === value);
                return region ? `${region.name} (${region.code})` : "Choisir votre région";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {regions.map(region => (
              <SelectItem key={region.id} value={region.id}>
                {region.name} ({region.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Motivation (optionnel)</FieldLabel>
        <Textarea
          value={form.motivation}
          onChange={event => update("motivation", event.target.value)}
          placeholder="Pourquoi souhaitez-vous participer à la JNJL ?"
          className="min-h-[110px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <label className="flex items-start gap-2.5 text-sm" style={{ color: charter.inkSoft }}>
        <Checkbox
          className="mt-0.5"
          checked={form.consent}
          onCheckedChange={checked => update("consent", Boolean(checked))}
        />
        J&apos;accepte que mes informations soient utilisées pour traiter ma candidature à la JNJL.
      </label>

      <Button
        type="submit"
        loading={isPending} disabled={!form.consent}
        className="h-12 w-full gap-2 rounded-none text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto sm:px-10"
        style={{ backgroundColor: charter.orange }}
      >
        {isPending ? "Envoi en cours..." : "Envoyer ma candidature"}
      </Button>
    </form>
  );
}
