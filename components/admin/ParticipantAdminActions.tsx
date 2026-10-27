"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, RotateCcw, XCircle } from "lucide-react";
import {
  cancelParticipantAction,
  restoreParticipantAction,
  resendParticipantEmailAction,
} from "@/actions/participant-admin-actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";

/** Annuler / rétablir une inscription et renvoyer l'e-mail du badge. Aucune donnée n'est jamais supprimée. */
export function ParticipantAdminActions({
  applicationId,
  cancelled,
  cancelledReason,
}: {
  applicationId: string;
  cancelled: boolean;
  cancelledReason: string | null;
}) {
  const router = useRouter();
  const { confirm, prompt } = useConfirm();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const cancel = async () => {
    const reason = await prompt({
      title: "Annuler cette inscription ?",
      description:
        "Le badge est désactivé et la place est libérée. Les informations du participant sont conservées et l'annulation peut être défaite.",
      label: "Motif de l'annulation (obligatoire)",
      confirmLabel: "Annuler l'inscription",
      variant: "destructive",
    });
    if (!reason) return;
    setMessage(null);
    startTransition(async () => {
      const result = await cancelParticipantAction(applicationId, reason);
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      setMessage({ ok: true, text: "Inscription annulée." });
      router.refresh();
    });
  };

  const restore = async () => {
    const confirmed = await confirm({
      title: "Rétablir cette inscription ?",
      description: "Le badge est réactivé et la personne reprend sa place.",
      confirmLabel: "Rétablir",
    });
    if (!confirmed) return;
    setMessage(null);
    startTransition(async () => {
      const result = await restoreParticipantAction(applicationId);
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      setMessage({ ok: true, text: "Inscription rétablie." });
      router.refresh();
    });
  };

  const resend = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await resendParticipantEmailAction(applicationId);
      setMessage(result.ok ? { ok: true, text: "E-mail renvoyé." } : { ok: false, text: result.error });
    });
  };

  return (
    <div className="mt-4 space-y-2">
      {cancelled && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Inscription annulée{cancelledReason ? ` : ${cancelledReason}` : ""}.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {cancelled ? (
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={restore}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Rétablir
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={resend}>
              <Mail className="mr-2 h-4 w-4" />
              Renvoyer l&apos;e-mail du badge
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={cancel}>
              <XCircle className="mr-2 h-4 w-4" />
              Annuler l&apos;inscription
            </Button>
          </>
        )}
      </div>
      {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-destructive"}`}>{message.text}</p>}
    </div>
  );
}
