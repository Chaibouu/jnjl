"use client";

import { useState, useTransition } from "react";
import { setWhatsappGroupUrlAction } from "@/actions/site-settings-actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import charter from "@/settings/charter";

/** Lien du bouton flottant WhatsApp du site public : modifiable ici, sans toucher au code. */
export function WhatsAppSettings({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [saved, setSaved] = useState(initialUrl);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await setWhatsappGroupUrlAction(url);
        setUrl(result.whatsappGroupUrl);
        setSaved(result.whatsappGroupUrl);
        setMessage(
          result.whatsappGroupUrl
            ? "Lien enregistré : le bouton WhatsApp est affiché sur le site."
            : "Lien retiré : le bouton WhatsApp n'est plus affiché."
        );
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Groupe WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Lien ouvert par le bouton WhatsApp flottant du site public. Laissez vide pour masquer le bouton.
        </p>
      </div>
      <Field>
        <FieldLabel>Lien d&apos;invitation du groupe</FieldLabel>
        <Input
          type="url"
          value={url}
          onChange={event => setUrl(event.target.value)}
          placeholder="https://chat.whatsapp.com/XXXXXXXXXXXX"
          className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          loading={isPending}
          disabled={url.trim() === saved}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
        {saved && (
          <a
            href={saved}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
            style={{ color: charter.orange }}
          >
            Tester le lien
          </a>
        )}
      </div>
    </form>
  );
}
