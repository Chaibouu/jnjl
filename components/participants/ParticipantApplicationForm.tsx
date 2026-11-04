"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { ChoiceSelect } from "@/components/ui/choice-select";
import { GENDER_OPTIONS, type Gender } from "@/lib/gender";
import { ParticipantBadgeDownloadButton } from "@/components/participants/ParticipantBadgeDownloadButton";
import { ParticipantPhotoUpload } from "@/components/participants/ParticipantPhotoUpload";
import { uploadParticipantPhotoAction } from "@/actions/participant-photo-actions";
import { shrinkImage } from "@/lib/client-image";
import { ENTREPRENEURSHIP_OPTIONS, PROFESSIONS, type EntrepreneurshipCommitment } from "@/lib/participant-options";
import charter from "@/settings/charter";

const inputClass =
  "h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white";

type Region = { id: string; name: string; code: string };

const PARTICIPATED_OPTIONS: [string, string][] = [
  ["NON", "Non"],
  ["OUI", "Oui"],
];

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "" as "" | Gender,
  regionId: "",
  profession: "",
  hasParticipatedBefore: "" as "" | "OUI" | "NON",
  entrepreneurshipCommitment: "" as "" | EntrepreneurshipCommitment,
  willTravelToNiamey: "" as "" | "OUI" | "NON",
  consent: false,
};

export function ParticipantApplicationForm({
  regions,
  hasActiveEdition,
  embedded = false,
}: {
  regions: Region[];
  hasActiveEdition: boolean;
  /** Sans carte propre (bordure/ombre) : utilisé quand la page fournit déjà ce cadre (ex. avec la bannière). */
  embedded?: boolean;
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [trap, setTrap] = useState("");
  const startedAt = useRef(Date.now());
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm(current => ({ ...current, [field]: value }));

  // Hors Niamey, le participant confirme qu'il fera le déplacement à ses frais.
  const selectedRegion = regions.find(item => item.id === form.regionId);
  const needsTravelConfirmation = !!selectedRegion && selectedRegion.name.trim().toLowerCase() !== "niamey";

  const cardClass = embedded ? "p-6 sm:p-8" : "rounded-2xl border bg-white p-10 text-center shadow-sm";
  const cardStyle = embedded ? undefined : { borderColor: charter.border };
  const formCardClass = embedded ? "space-y-5 p-6 sm:p-8" : "space-y-5 rounded-2xl border bg-white p-6 shadow-sm sm:p-8";
  const formCardStyle = embedded ? undefined : { borderColor: charter.border };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!form.gender) {
      setError("Veuillez choisir votre sexe (Masculin ou Féminin).");
      return;
    }
    if (!form.regionId) {
      setError("Veuillez choisir votre région.");
      return;
    }
    if (needsTravelConfirmation && !form.willTravelToNiamey) {
      setError("Merci de confirmer si vous comptez faire le déplacement à Niamey à vos frais.");
      return;
    }
    if (!form.profession) {
      setError("Veuillez choisir votre profession.");
      return;
    }
    if (!form.entrepreneurshipCommitment) {
      setError("Merci de préciser si vous souhaitez prendre un engagement à l'entrepreneuriat.");
      return;
    }
    if (!form.hasParticipatedBefore) {
      setError("Merci de préciser si vous avez déjà participé à la JNJL.");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/applications/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            hasParticipatedBefore: form.hasParticipatedBefore === "OUI",
            willTravelToNiamey: needsTravelConfirmation ? form.willTravelToNiamey === "OUI" : undefined,
            // Anti-robot : champ piège (vide pour un humain) et durée de remplissage.
            website: trap,
            elapsedMs: Date.now() - startedAt.current,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          // Détail champ par champ renvoyé par le serveur (ex. « Le numéro de téléphone n'est pas valide »).
          const details = result.errors
            ? Object.values(result.errors as Record<string, string[]>)
                .flat()
                .join(" · ")
            : "";
          throw new Error(
            details ? `${result.error} : ${details}` : result.error || "Impossible d'enregistrer la candidature"
          );
        }
        setForm(emptyForm);
        setApplicationId(result.applicationId ?? null);
        // Photo facultative : envoyée après l'inscription, un échec ne la remet jamais en cause (on peut la rajouter ensuite).
        if (photoFile && result.applicationId) {
          try {
            const formData = new FormData();
            formData.set("file", await shrinkImage(photoFile));
            const uploaded = await uploadParticipantPhotoAction(result.applicationId, formData);
            if (uploaded.ok) setPhotoUrl(uploaded.photoUrl);
          } catch {
            // Sans effet : la confirmation propose d'ajouter la photo.
          }
        }
        setPhotoFile(null);
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
      <div className={cardClass} style={cardStyle}>
        <p className="text-sm" style={{ color: charter.inkSoft }}>
          Aucune édition n&apos;accepte actuellement les candidatures. Revenez bientôt !
        </p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className={`flex flex-col items-center text-center ${cardClass}`} style={cardStyle}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${charter.orange}15` }}>
          <CheckCircle2 className="h-6 w-6" style={{ color: charter.orange }} />
        </div>
        <h3 className="mt-4 text-lg font-bold" style={{ color: charter.ink }}>
          Inscription confirmée
        </h3>
        <p className="mt-2 max-w-sm text-sm" style={{ color: charter.inkSoft }}>
          Merci ! Votre participation à la JNJL est confirmée. Téléchargez dès maintenant
          votre badge de participant : présentez-le à l&apos;accueil de l&apos;événement.
        </p>
        {applicationId && (
          <div className="mt-6 flex flex-col items-center gap-6">
            <ParticipantPhotoUpload applicationId={applicationId} initialPhotoUrl={photoUrl} />
            <ParticipantBadgeDownloadButton applicationId={applicationId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={formCardClass} style={formCardStyle}>
        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}
        {/* Champ piège invisible : seuls les robots le remplissent. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Site web
            <input tabIndex={-1} autoComplete="off" value={trap} onChange={event => setTrap(event.target.value)} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>Région de rattachement</FieldLabel>
            <ChoiceSelect
              inputId="region"
              value={form.regionId}
              onChange={value => update("regionId", value)}
              placeholder="Choisir votre région"
              options={regions.map(region => ({ value: region.id, label: region.name }))}
            />
          </Field>
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
            <ChoiceSelect
              inputId="gender"
              searchable={false}
              value={form.gender}
              onChange={value => update("gender", value as Gender)}
              options={GENDER_OPTIONS.map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field>
            <FieldLabel>Profession</FieldLabel>
            <ChoiceSelect
              inputId="profession"
              value={form.profession}
              onChange={value => update("profession", value)}
              placeholder="Choisir votre profession"
              options={PROFESSIONS.map(profession => ({ value: profession, label: profession }))}
            />
          </Field>
          <Field>
            <FieldLabel>Avez-vous déjà participé à la JNJL ?</FieldLabel>
            <ChoiceSelect
              inputId="participated"
              searchable={false}
              value={form.hasParticipatedBefore}
              onChange={value => update("hasParticipatedBefore", value as "OUI" | "NON")}
              options={PARTICIPATED_OPTIONS.map(([value, label]) => ({ value, label }))}
            />
          </Field>
        </div>

        {needsTravelConfirmation && (
          <Field>
            <FieldLabel>Comptez-vous faire le déplacement sur Niamey à vos frais ?</FieldLabel>
            <ChoiceSelect
              inputId="travel"
              searchable={false}
              value={form.willTravelToNiamey}
              onChange={value => update("willTravelToNiamey", value as "OUI" | "NON")}
              options={[
                { value: "OUI", label: "Oui" },
                { value: "NON", label: "Non" },
              ]}
            />
            <p className="mt-1 text-xs" style={{ color: charter.inkSoft }}>
              La cérémonie a lieu à Niamey ; le transport et l&apos;hébergement des participants de l&apos;intérieur du pays sont à leur charge.
            </p>
          </Field>
        )}

        <Field>
          <FieldLabel>Souhaitez-vous prendre un engagement à l&apos;entrepreneuriat lors de cette cérémonie ?</FieldLabel>
          <ChoiceSelect
            inputId="entrepreneurship"
            searchable={false}
            value={form.entrepreneurshipCommitment}
            onChange={value => update("entrepreneurshipCommitment", value as EntrepreneurshipCommitment)}
            options={ENTREPRENEURSHIP_OPTIONS.map(([value, label]) => ({ value, label }))}
          />
        </Field>

        <Field>
          <FieldLabel>Photo pour votre badge (facultatif)</FieldLabel>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={event => setPhotoFile(event.target.files?.[0] ?? null)}
            className={inputClass}
          />
          <p className="mt-1 text-xs" style={{ color: charter.inkSoft }}>
            Sans photo, votre badge garde le logo de la JNJL. Vous pourrez aussi l&apos;ajouter après l&apos;inscription.
          </p>
        </Field>

        <label className="flex items-start gap-2.5 text-sm" style={{ color: charter.inkSoft }}>
          <Checkbox
            className="mt-0.5"
            checked={form.consent}
            onCheckedChange={checked => update("consent", Boolean(checked))}
          />
          J&apos;accepte que mes informations (et ma photo, si je l&apos;ajoute) soient utilisées pour traiter ma candidature et éditer mon badge de la JNJL.
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
