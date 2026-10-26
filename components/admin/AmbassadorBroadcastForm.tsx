"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendAmbassadorBroadcastAction } from "@/actions/notification-broadcast-actions";
import { Button } from "@/components/ui/button";
import { BROADCAST_LINK_OPTIONS, BROADCAST_STAGE_OPTIONS } from "@/lib/broadcast-links";

const fieldClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

/** Formulaire admin : envoie un message dans les notifications des ambassadeurs retenus. */
export function AmbassadorBroadcastForm({ regions }: { regions: { id: string; name: string }[] }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [regionId, setRegionId] = useState("");
  const [stage, setStage] = useState("");
  const [paidOnly, setPaidOnly] = useState(true);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const send = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await sendAmbassadorBroadcastAction({ title, message, link, regionId, stage, paidOnly: paidOnly && stage !== "PAIEMENT" });
      if (result.ok) {
        setFeedback({ ok: true, text: `Message envoyé à ${result.count} ambassadeur${result.count > 1 ? "s" : ""}.` });
        setTitle("");
        setMessage("");
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <details className="rounded-2xl border bg-card p-5 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold">Envoyer un message aux ambassadeurs</summary>
      <div className="mt-4 space-y-3">
        <input
          className={fieldClass}
          placeholder="Titre (ex. Demandes de permission disponibles)"
          maxLength={120}
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
        <textarea
          className={fieldClass}
          rows={4}
          maxLength={1000}
          placeholder="Message (ex. Vos demandes de permission sont disponibles, vous pouvez les télécharger.)"
          value={message}
          onChange={event => setMessage(event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Lien du bouton
            <select className={fieldClass} value={link} onChange={event => setLink(event.target.value)}>
              {BROADCAST_LINK_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Destinataires
            <select className={fieldClass} value={regionId} onChange={event => setRegionId(event.target.value)}>
              <option value="">Toutes les régions</option>
              {regions.map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          Étape du parcours
          <select className={fieldClass} value={stage} onChange={event => setStage(event.target.value)}>
            {BROADCAST_STAGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paidOnly && stage !== "PAIEMENT"} disabled={stage === "PAIEMENT"} onChange={event => setPaidOnly(event.target.checked)} />
          Seulement les ambassadeurs retenus ayant payé
        </label>
        <div className="flex items-center gap-3">
          <Button type="button" loading={isPending} onClick={send} disabled={!title.trim() || !message.trim()}>
            <Send className="mr-2 h-4 w-4" />
            Envoyer
          </Button>
          {feedback && (
            <p className={`text-sm ${feedback.ok ? "text-green-600" : "text-destructive"}`}>{feedback.text}</p>
          )}
        </div>
      </div>
    </details>
  );
}
