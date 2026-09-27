"use client";

import { useState, useTransition } from "react";
import { IdCard, Search } from "lucide-react";
import { findParticipantBadgeByPhoneAction } from "@/actions/participant-badge-actions";
import { ParticipantBadgeDownloadButton } from "@/components/participants/ParticipantBadgeDownloadButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import charter from "@/settings/charter";

/** Permet à un participant déjà inscrit de retrouver son badge à partir de son numéro de téléphone. */
export function RecoverBadgeForm() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [found, setFound] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setFound(null);
    startTransition(async () => {
      try {
        setFound(await findParticipantBadgeByPhoneAction(phone));
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  if (!open) {
    return (
      <div className="mb-8 flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-11 gap-2 rounded-none border-2 font-semibold"
          style={{ borderColor: charter.orange, color: charter.orange }}
        >
          <IdCard className="h-4 w-4" />
          Badge perdu ? Le retrouver
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: charter.border }}>
      <h3 className="text-sm font-bold" style={{ color: charter.ink }}>
        Retrouver mon badge
      </h3>
      <p className="mt-1 text-sm" style={{ color: charter.inkSoft }}>
        Saisissez le numéro de téléphone utilisé lors de votre inscription.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field className="flex-1">
          <FieldLabel>Téléphone</FieldLabel>
          <Input
            type="tel"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            required
            placeholder="+227 00 00 00 00"
            className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
          />
        </Field>
        <Button
          type="submit"
          loading={isPending}
          className="h-11 gap-2 rounded-none font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          <Search className="h-4 w-4" />
          Rechercher
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {found && (
        <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-sm">
            Badge retrouvé pour <span className="font-semibold">{found.firstName} {found.lastName}</span>.
          </p>
          <div className="mt-3 flex justify-center">
            <ParticipantBadgeDownloadButton applicationId={found.id} />
          </div>
        </div>
      )}
    </div>
  );
}
