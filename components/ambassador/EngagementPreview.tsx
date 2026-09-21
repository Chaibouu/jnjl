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
 * Aperçu de la fiche AVANT signature : reproduit la mise en page du PDF qui sera généré,
 * avec le nom saisi. Rien n'est enregistré.
 */
export function EngagementDraftPreview({
  editionName,
  ambassadorName,
  region,
  engagementText,
  signatureName,
}: {
  editionName: string;
  ambassadorName: string;
  region: string;
  engagementText: string;
  signatureName: string;
}) {
  const now = new Date();
  const name = signatureName.trim();

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Eye className="mr-2 h-4 w-4" />
        Prévisualiser ma fiche
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Aperçu de ma fiche d&apos;engagement</DialogTitle>
          <DialogDescription>
            Voici le document tel qu&apos;il sera généré. Il n&apos;est pas signé tant que vous n&apos;avez pas
            cliqué sur « Signer l&apos;engagement ».
          </DialogDescription>
        </DialogHeader>

        <div className="relative border bg-white p-8 shadow-inner sm:p-12">
          <span
            className="absolute right-4 top-4 border px-2 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ borderColor: charter.orange, color: charter.orange }}
          >
            Aperçu — non signé
          </span>

          <h2 className="pr-32 text-xl font-bold">Fiche d&apos;engagement — Ambassadeur JNJL</h2>
          <p className="mt-4 text-sm">Édition : {editionName}</p>
          <p className="text-sm">
            Ambassadeur : {ambassadorName} ({region})
          </p>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{engagementText}</div>

          <div className="mt-10 border-t pt-6">
            <h3 className="text-base font-bold">Acceptation</h3>
            <p className="mt-2 text-sm">
              Je soussigné(e), {name ? <strong>{name}</strong> : <span className="text-muted-foreground">[votre nom complet]</span>},
              déclare avoir lu et accepté les termes ci-dessus.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Signé électroniquement le {now.toLocaleDateString("fr-FR")} à {now.toLocaleTimeString("fr-FR")}.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Aperçu du PDF DÉJÀ signé, affiché dans la page, avec téléchargement. */
export function SignedEngagementPreview({ fileUrl }: { fileUrl: string }) {
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
