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

/** Bouton + fenêtre d'aperçu d'un PDF déjà généré (attestations, documents…), avec téléchargement. */
export function PdfPreviewDialog({
  fileUrl,
  title,
  buttonLabel = "Prévisualiser",
  buttonVariant = "default",
  size = "default",
}: {
  fileUrl: string;
  title: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline";
  size?: "default" | "sm";
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant={buttonVariant} size={size} />}>
        <Eye className="mr-2 h-4 w-4" />
        {buttonLabel}
      </DialogTrigger>
      <DialogContent className="flex max-h-[94vh] flex-col overflow-hidden rounded-none sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Si l&apos;aperçu ne s&apos;affiche pas, ouvrez ou téléchargez le fichier ci-dessous.
          </DialogDescription>
        </DialogHeader>
        <iframe src={fileUrl} title={title} className="h-[68vh] w-full border bg-muted" />
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
  );
}
