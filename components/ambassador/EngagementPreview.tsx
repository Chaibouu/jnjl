"use client";

import { Download, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import charter from "@/settings/charter";

/**
 * Fiche DÉJÀ signée : les fiches Word (format officiel) se téléchargent ; les anciennes fiches PDF
 * restent consultables dans la page.
 */
export function SignedEngagementPreview({ fileUrl }: { fileUrl: string }) {
  if (!fileUrl.toLowerCase().endsWith(".pdf")) {
    return (
      <div className="flex justify-center">
        <a
          href={fileUrl}
          download
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
          style={{ color: charter.orange }}
        >
          <Download className="h-4 w-4" />
          Télécharger ma fiche d&apos;engagement signée
        </a>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Dialog>
        <DialogTrigger render={<Button type="button" />}>
          <Eye className="mr-2 h-4 w-4" />
          Prévisualiser ma fiche signée
        </DialogTrigger>
        <DialogContent className="flex max-h-[94vh] flex-col overflow-hidden rounded-none sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ma fiche d&apos;engagement signée
            </DialogTitle>
            <DialogDescription>
              Si l&apos;aperçu ne s&apos;affiche pas, ouvrez ou téléchargez le fichier ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <iframe
            src={fileUrl}
            title="Fiche d'engagement signée"
            className="h-[70vh] w-full border bg-muted"
          />
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
            style={{ color: charter.orange }}
          >
            <Download className="h-4 w-4" />
            Télécharger le PDF
          </a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
