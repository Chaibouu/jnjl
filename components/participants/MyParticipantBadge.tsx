"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { findParticipantBadgeAction, type ParticipantBadgeView } from "@/actions/participant-badge-actions";
import { ParticipantBadgeDownloadButton } from "@/components/participants/ParticipantBadgeDownloadButton";
import { ParticipantBadgePreview } from "@/components/participants/ParticipantBadgePreview";
import { ParticipantPhotoUpload } from "@/components/participants/ParticipantPhotoUpload";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import charter from "@/settings/charter";

const inputClass =
  "h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white";

/**
 * Page publique « Mon badge » : le participant retrouve son badge avec son numéro (téléphone ou badge) et son nom, le voit
 * s'afficher, peut ajouter, changer ou ajuster sa photo (cadrage et zoom) puis télécharger le PDF.
 */
export function MyParticipantBadge() {
  const [query, setQuery] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [badge, setBadge] = useState<ParticipantBadgeView | null>(null);
  const [isPending, startTransition] = useTransition();

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await findParticipantBadgeAction(query, lastName);
        if (result.ok) setBadge(result);
        else setError(result.error);
      } catch {
        setError("Une erreur est survenue, veuillez réessayer.");
      }
    });
  };

  if (badge) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-xl font-bold" style={{ color: charter.ink }}>
            {badge.firstName} {badge.lastName}
          </h2>
          <p className="mt-1 text-sm" style={{ color: charter.inkSoft }}>
            Aperçu de votre badge. Le PDF téléchargé est la version officielle.
          </p>
        </div>

        <ParticipantBadgePreview
          fullName={`${badge.firstName} ${badge.lastName}`}
          region={badge.region}
          badgeNumber={badge.badgeNumber}
          qrValue={badge.qrValue}
          photoUrl={badge.photoUrl}
        />

        <div className="border bg-white p-6" style={{ borderColor: charter.border }}>
          <h3 className="mb-4 text-center text-sm font-bold" style={{ color: charter.ink }}>
            Ma photo sur le badge
          </h3>
          <ParticipantPhotoUpload
            applicationId={badge.id}
            initialPhotoUrl={badge.photoUrl}
            onChange={photoUrl => setBadge(current => (current ? { ...current, photoUrl } : current))}
          />
        </div>

        <ParticipantBadgeDownloadButton applicationId={badge.id} />

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setBadge(null);
              setQuery("");
              setLastName("");
            }}
            className="text-sm underline underline-offset-2"
            style={{ color: charter.inkSoft }}
          >
            Chercher un autre badge
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={search} className="space-y-5">
      <div className="space-y-1 text-center">
        <h2 className="text-lg font-bold" style={{ color: charter.ink }}>
          Retrouvez votre badge
        </h2>
        <p className="text-sm" style={{ color: charter.inkSoft }}>
          Saisissez le numéro de téléphone (ou le numéro de badge) et le nom de famille utilisés lors de votre inscription.
        </p>
      </div>
      <Field>
        <FieldLabel>
          Téléphone ou n° de badge
          <span className="text-destructive" aria-hidden="true">
            {" "}*
          </span>
        </FieldLabel>
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          required
          placeholder="+227 00 00 00 00"
          className={inputClass}
        />
      </Field>
      <Field>
        <FieldLabel>
          Nom de famille
          <span className="text-destructive" aria-hidden="true">
            {" "}*
          </span>
        </FieldLabel>
        <Input
          value={lastName}
          onChange={event => setLastName(event.target.value)}
          required
          placeholder="Votre nom de famille"
          className={inputClass}
        />
      </Field>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        loading={isPending}
        className="h-12 w-full gap-2 rounded-none text-base font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: charter.orange }}
      >
        <Search className="h-4 w-4" />
        {isPending ? "Recherche…" : "Afficher mon badge"}
      </Button>
    </form>
  );
}
