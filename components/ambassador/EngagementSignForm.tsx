"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { signEngagementAction, type EngagementFormInput } from "@/actions/engagement-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignedEngagementPreview } from "@/components/ambassador/EngagementPreview";
import charter from "@/settings/charter";

type FormValues = Omit<EngagementFormInput, "sexe"> & { sexe: EngagementFormInput["sexe"] | "" };

const SEXE_LABEL = { MASCULIN: "Masculin", FEMININ: "Féminin" } as const;

export function EngagementSignForm({
  engagementText,
  region,
  initialValues,
}: {
  engagementText: string;
  region: string;
  initialValues: FormValues;
}) {
  const [values, setValues] = useState<FormValues>(initialValues);
  // Une fois cochée, la case ne peut plus être décochée : l'engagement est définitif.
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues(current => ({ ...current, [key]: value }));
  const fullName = `${values.prenom} ${values.nom}`.trim();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.sexe) {
      setError("Renseignez votre sexe");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await signEngagementAction({ ...values, sexe: values.sexe as EngagementFormInput["sexe"] });
        setFileUrl(result.fileUrl);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  if (fileUrl) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10" style={{ color: charter.orange }} />
        <h2 className="text-lg font-bold">Engagement signé !</h2>
        <p className="text-sm text-muted-foreground">
          Vous pouvez maintenant continuer votre parcours ambassadeur.
        </p>
        <SignedEngagementPreview fileUrl={fileUrl} />
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
          style={{ color: charter.orange }}
        >
          <FileText className="h-4 w-4" />
          Télécharger ma fiche signée
        </a>
      </div>
    );
  }

  const required = <span className="text-red-600">*</span>;

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div>
        <h2 className="text-base font-bold">Fiche d&apos;inscription</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vérifiez vos informations et complétez celles qui manquent : elles seront reportées sur votre fiche.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Nom {required}</FieldLabel>
            <Input value={values.nom} onChange={event => set("nom", event.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>Prénom {required}</FieldLabel>
            <Input value={values.prenom} onChange={event => set("prenom", event.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>Sexe {required}</FieldLabel>
            <Select value={values.sexe} onValueChange={value => value && set("sexe", value as FormValues["sexe"])}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Choisir">
                  {(value: string) => SEXE_LABEL[value as keyof typeof SEXE_LABEL] ?? "Choisir"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MASCULIN">Masculin</SelectItem>
                <SelectItem value="FEMININ">Féminin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Adresse e-mail {required}</FieldLabel>
            <Input type="email" value={values.email} onChange={event => set("email", event.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>Téléphone {required}</FieldLabel>
            <Input type="tel" value={values.telephone} onChange={event => set("telephone", event.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>Lieu de résidence {required}</FieldLabel>
            <Input
              value={values.lieuResidence}
              onChange={event => set("lieuResidence", event.target.value)}
              placeholder="Ville ou quartier"
              required
            />
          </Field>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-5 text-sm leading-relaxed">
        {engagementText}
      </div>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox
          className="mt-0.5"
          checked={checked}
          disabled={checked}
          // Une fois cochée, la case reste cochée : impossible de revenir en arrière.
          onCheckedChange={value => setChecked(current => current || Boolean(value))}
        />
        <span>
          <strong>Je m&apos;engage</strong> à respecter les termes de cette fiche, en tant que {fullName || "—"} ({region}).
          Une fois cochée, cette case ne peut plus être décochée. Votre fiche officielle (modèle JNJL 6) sera générée et téléchargeable après signature.
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          loading={isPending}
          disabled={!checked}
          className="h-8 w-full rounded-none text-white hover:opacity-90 sm:w-auto sm:px-10"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending ? "Signature en cours..." : "Signer et télécharger ma fiche"}
        </Button>
      </div>
    </form>
  );
}
