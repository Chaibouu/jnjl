"use client";

import { useState, useTransition } from "react";
import { setRegistrationSettingsAction } from "@/actions/site-settings-actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import charter from "@/settings/charter";

type State = {
  ambassadorsOpen: boolean;
  participantsOpen: boolean;
  ambassadorsNote: string;
  participantsNote: string;
  participantsCapacity: number;
  posterOpen: boolean;
  posterNote: string;
};

const inputClass =
  "h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white";

/** Ouverture / fermeture des candidatures du site public : ambassadeurs et inscriptions à l'événement. */
export function RegistrationSettings({ initial }: { initial: State }) {
  const [state, setState] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const dirty = JSON.stringify(state) !== JSON.stringify(saved);
  const update = <K extends keyof State>(key: K, value: State[K]) => setState(current => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await setRegistrationSettingsAction(state);
        setState(result);
        setSaved(result);
        setMessage("Réglages enregistrés : le site public est à jour.");
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Ouverture des candidatures</h2>
        <p className="text-sm text-muted-foreground">
          Quand c&apos;est fermé, la page reste en ligne mais indique que c&apos;est fermé (avec votre message), le lien disparaît du menu
          et les envois sont refusés. Les candidatures déjà reçues ne sont pas touchées.
        </p>
      </div>

      <Block
        title="Candidatures ambassadeurs"
        open={state.ambassadorsOpen}
        onOpenChange={value => update("ambassadorsOpen", value)}
        note={state.ambassadorsNote}
        onNoteChange={value => update("ambassadorsNote", value)}
        notePlaceholder="Par défaut : « Rendez-vous à la prochaine édition. »"
      />
      <Block
        title="Inscriptions des participants à l'événement"
        open={state.participantsOpen}
        onOpenChange={value => update("participantsOpen", value)}
        note={state.participantsNote}
        onNoteChange={value => update("participantsNote", value)}
        notePlaceholder="Ex. Ouverture des inscriptions prévue en novembre 2026."
      />
      <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-semibold">Nombre maximum de participants</p>
        <p className="text-xs text-muted-foreground">
          Une fois ce nombre atteint, les inscriptions sont refusées automatiquement. 0 = pas de limite.
        </p>
        <Input
          type="number"
          min={0}
          value={state.participantsCapacity}
          onChange={event => update("participantsCapacity", Math.max(0, Number(event.target.value) || 0))}
          className={`${inputClass} w-40`}
        />
      </div>
      <Block
        title="Page « Mon affiche J'y serai »"
        open={state.posterOpen}
        onOpenChange={value => update("posterOpen", value)}
        note={state.posterNote}
        onNoteChange={value => update("posterNote", value)}
        notePlaceholder="Ex. La campagne « J'y serai » reviendra bientôt."
        openText="Ouverte : le public peut créer et partager son affiche."
        closedText="Fermée : la page indique que la campagne est terminée ou pas encore ouverte."
      />

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        loading={isPending}
        disabled={!dirty}
        className="text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: charter.orange }}
      >
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}

function Block({
  title,
  open,
  onOpenChange,
  note,
  onNoteChange,
  notePlaceholder,
  openText = "Ouvertes : le formulaire est accessible au public.",
  closedText = "Fermées : la page indique que c'est fermé.",
}: {
  title: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  note: string;
  onNoteChange: (value: string) => void;
  notePlaceholder: string;
  openText?: string;
  closedText?: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {open ? openText : closedText}
          </p>
        </div>
        <Switch checked={open} onCheckedChange={onOpenChange} />
      </div>
      {!open && (
        <Field>
          <FieldLabel>Message affiché aux visiteurs (optionnel)</FieldLabel>
          <Input
            value={note}
            onChange={event => onNoteChange(event.target.value)}
            maxLength={200}
            placeholder={notePlaceholder}
            className={inputClass}
          />
        </Field>
      )}
    </div>
  );
}
