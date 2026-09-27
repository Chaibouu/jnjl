"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { downloadParticipantBadgeAction } from "@/actions/participant-badge-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

/** Télécharge le badge de participant en PDF (A6), disponible immédiatement après l'inscription. */
export function ParticipantBadgeDownloadButton({ applicationId }: { applicationId: string }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const download = () => {
    setError("");
    startTransition(async () => {
      try {
        const { filename, base64 } = await downloadParticipantBadgeAction(applicationId);
        const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Téléchargement impossible");
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        loading={isPending}
        onClick={download}
        className="h-11 px-6 font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: charter.orange }}
      >
        <Download className="mr-2 h-4 w-4" />
        {isPending ? "Préparation…" : "Télécharger mon badge (PDF)"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Format A6, prêt à imprimer ou à garder sur votre téléphone.</p>
    </div>
  );
}
