"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { downloadMyTrainingAttestationAction } from "@/actions/training-attestation-actions";
import { Button } from "@/components/ui/button";
import { downloadPdfBase64 } from "@/lib/download-pdf";

/** Télécharge l'attestation de formation en PDF (A4 paysage). */
export function TrainingAttestationDownload() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const download = () => {
    setError("");
    startTransition(async () => {
      try {
        const result = await downloadMyTrainingAttestationAction();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        downloadPdfBase64(result.base64, result.filename);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Téléchargement impossible");
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" loading={isPending} onClick={download} className="h-10 px-6 font-semibold">
        <Download className="mr-2 h-4 w-4" />
        {isPending ? "Préparation…" : "Télécharger mon attestation (PDF)"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
