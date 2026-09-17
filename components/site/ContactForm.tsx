"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { submitContactMessageAction } from "@/actions/contact-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import charter from "@/settings/charter";

const inputClass =
  "h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white";

const emptyForm = { name: "", email: "", subject: "", message: "", website: "" };

export function ContactForm() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const update = (field: keyof typeof form, value: string) =>
    setForm(current => ({ ...current, [field]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await submitContactMessageAction(form);
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

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-white p-10 text-center shadow-sm" style={{ borderColor: charter.border }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${charter.orange}15` }}>
          <CheckCircle2 className="h-6 w-6" style={{ color: charter.orange }} />
        </div>
        <h3 className="mt-4 text-lg font-bold" style={{ color: charter.ink }}>
          Message envoyé
        </h3>
        <p className="mt-2 max-w-sm text-sm" style={{ color: charter.inkSoft }}>
          Merci de nous avoir contactés, nous reviendrons vers vous très rapidement.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 rounded-none"
          onClick={() => setSent(false)}
        >
          Envoyer un autre message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: charter.border }}>
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      {/* Honeypot anti-spam — invisible pour un humain */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={event => update("website", event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Nom complet</FieldLabel>
          <Input
            value={form.name}
            onChange={event => update("name", event.target.value)}
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
      </div>

      <Field>
        <FieldLabel>Sujet (optionnel)</FieldLabel>
        <Input
          value={form.subject}
          onChange={event => update("subject", event.target.value)}
          placeholder="Objet de votre message"
          className={inputClass}
        />
      </Field>

      <Field>
        <FieldLabel>Message</FieldLabel>
        <Textarea
          value={form.message}
          onChange={event => update("message", event.target.value)}
          required
          minLength={10}
          placeholder="Écrivez votre message..."
          className="min-h-[140px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
      </Field>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 w-full gap-2 rounded-none text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto sm:px-10"
        style={{ backgroundColor: charter.orange }}
      >
        {isPending ? "Envoi en cours..." : "Envoyer le message"}
      </Button>
    </form>
  );
}

export function ContactInfo() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color: charter.inkSoft }}>
        Une question sur la JNJL, votre candidature ou un partenariat ? Écrivez-nous, notre
        équipe vous répond dans les meilleurs délais.
      </p>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${charter.orange}12` }}>
            <Mail className="h-4 w-4" style={{ color: charter.orange }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: charter.inkFaint }}>Email</p>
            <p className="text-sm font-medium" style={{ color: charter.ink }}>contact@jnjl.ne</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${charter.orange}12` }}>
            <Phone className="h-4 w-4" style={{ color: charter.orange }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: charter.inkFaint }}>Téléphone</p>
            <p className="text-sm font-medium" style={{ color: charter.ink }}>+227 00 00 00 00</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${charter.orange}12` }}>
            <MapPin className="h-4 w-4" style={{ color: charter.orange }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: charter.inkFaint }}>Adresse</p>
            <p className="text-sm font-medium" style={{ color: charter.ink }}>Niamey, Niger</p>
          </div>
        </div>
      </div>
    </div>
  );
}
