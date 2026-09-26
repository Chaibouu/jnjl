"use client";

import { useState, useTransition } from "react";
import { Calendar } from "lucide-react";
import { listRegionalQuotasAction, setRegionalQuotaAction } from "@/actions/quota-actions";
import {
  getEditionDocumentSettingsAction,
  updateEditionDocumentSettingsAction,
} from "@/actions/edition-document-settings-actions";
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
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };
type Quota = Awaited<ReturnType<typeof listRegionalQuotasAction>>[number];
type DocumentSettings = Awaited<ReturnType<typeof getEditionDocumentSettingsAction>>;

const DEFAULT_PATRONAGE_TEXT =
  "sous le Haut Patronage de la Première Dame du Niger, Présidente de la Fondation Guri Vie Meilleure, HADJIA AÏSSATA ISSOUFOU.";

export function ParametresManager({
  editions,
  initialEditionId,
  initialQuotas,
  initialDocumentSettings,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialQuotas: Quota[];
  initialDocumentSettings: DocumentSettings | null;
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [quotas, setQuotas] = useState(initialQuotas);
  const [settings, setSettings] = useState(initialDocumentSettings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const [nextQuotas, nextSettings] = await Promise.all([
          listRegionalQuotasAction(value),
          getEditionDocumentSettingsAction(value),
        ]);
        setQuotas(nextQuotas);
        setSettings(nextSettings);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const changeQuota = (regionId: string, quota: number) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await setRegionalQuotaAction(editionId, regionId, quota);
        setQuotas(current => current.map(item => (item.regionId === regionId ? { ...item, quota } : item)));
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const updateSettingsField = (field: keyof DocumentSettings, value: string) =>
    setSettings(current => (current ? { ...current, [field]: value } : current));

  const submitSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await updateEditionDocumentSettingsAction(editionId, settings);
        setMessage("Réglages enregistrés");
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Édition</p>
          <h1 className="mt-1 text-3xl font-bold">Paramètres</h1>
          <p className="mt-2 text-muted-foreground">
            Quotas régionaux et réglages des documents administratifs (ordre de mission, demande de permission).
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={editionId} onValueChange={changeEdition}>
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
        </div>
      </header>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Quotas régionaux</h2>
          <p className="text-sm text-muted-foreground">
            Nombre de places par région pour la sélection des ambassadeurs.
          </p>
        </div>
        <div className="divide-y">
          {quotas.map(quota => (
            <div key={quota.regionId} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{quota.regionName}</p>
                <p className="text-xs text-muted-foreground">{quota.regionCode}</p>
              </div>
              <Input
                type="number"
                min={0}
                defaultValue={quota.quota}
                disabled={isPending}
                className="h-10 w-24 text-right"
                onBlur={event => {
                  const value = Number(event.target.value);
                  if (!Number.isNaN(value) && value !== quota.quota) changeQuota(quota.regionId, value);
                }}
              />
            </div>
          ))}
          {quotas.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Aucune région disponible.</p>
          )}
        </div>
      </div>

      {settings && (
        <form
          onSubmit={submitSettings}
          className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold">Ordre de mission</h2>
            <p className="text-sm text-muted-foreground">
              DATE DE DEPART et DATE DE RETOUR affichées sur l&apos;ordre de mission. Laissez vide pour reprendre
              les dates de l&apos;édition.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              label="Date de départ"
              value={settings.missionDepartureDate}
              onChange={value => updateSettingsField("missionDepartureDate", value)}
            />
            <DateField
              label="Date de retour"
              value={settings.missionReturnDate}
              onChange={value => updateSettingsField("missionReturnDate", value)}
            />
          </div>

          <div className="pt-2">
            <h2 className="text-lg font-semibold">Autorisation d&apos;absence</h2>
            <p className="text-sm text-muted-foreground">
              Période couverte par la demande de permission remise à l&apos;établissement. Laissez vide pour
              reprendre les dates de l&apos;édition.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              label="Début de l'absence"
              value={settings.absenceStartDate}
              onChange={value => updateSettingsField("absenceStartDate", value)}
            />
            <DateField
              label="Fin de l'absence"
              value={settings.absenceEndDate}
              onChange={value => updateSettingsField("absenceEndDate", value)}
            />
          </div>

          <div className="pt-2">
            <h2 className="text-lg font-semibold">Clause de patronage</h2>
            <p className="text-sm text-muted-foreground">
              Reprise telle quelle dans la demande de permission. Laissez vide pour le texte par défaut.
            </p>
          </div>
          <Field>
            <FieldLabel>Clause de patronage</FieldLabel>
            <Textarea
              className="min-h-[90px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
              placeholder={DEFAULT_PATRONAGE_TEXT}
              value={settings.patronageText}
              onChange={event => updateSettingsField("patronageText", event.target.value)}
            />
          </Field>

          <div className="pt-2">
            <h2 className="text-lg font-semibold">Attestation de participation</h2>
            <p className="text-sm text-muted-foreground">
              Texte inséré dans l&apos;attestation officielle JNJL (« Pour avoir suivi... sur le thème :
              «&nbsp;{"{thème}"}&nbsp;» tenue à {"{lieu}"} le {"{date}"} ... à la {"{édition}"} »). Laissez vide
              pour reprendre les valeurs de l&apos;édition.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Thème</FieldLabel>
              <Input
                value={settings.attestationTheme}
                onChange={event => updateSettingsField("attestationTheme", event.target.value)}
                placeholder="Leadership et Entrepreneuriat"
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
            <Field>
              <FieldLabel>Lieu</FieldLabel>
              <Input
                value={settings.attestationLocation}
                onChange={event => updateSettingsField("attestationLocation", event.target.value)}
                placeholder="Niamey"
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
            <DateField
              label="Date de début"
              value={settings.attestationStartDate}
              onChange={value => updateSettingsField("attestationStartDate", value)}
            />
            <DateField
              label="Date de fin"
              value={settings.attestationEndDate}
              onChange={value => updateSettingsField("attestationEndDate", value)}
            />
            <Field className="sm:col-span-2">
              <FieldLabel>Nom de l&apos;édition (dans la phrase finale)</FieldLabel>
              <Input
                value={settings.attestationEditionLabel}
                onChange={event => updateSettingsField("attestationEditionLabel", event.target.value)}
                placeholder="3è édition de la JNJL"
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
          </div>

          <Button
            type="submit"
            loading={isPending}
            className="text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
          >
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      )}
    </section>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="date"
          value={value}
          onChange={event => onChange(event.target.value)}
          className="h-11 rounded-none border border-border bg-muted/40 pl-9 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </div>
    </Field>
  );
}
