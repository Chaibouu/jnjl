"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import type { Designer } from "@pdfme/ui";
import {
  previewDocumentTemplateAction,
  saveDocumentTemplateAction,
} from "@/actions/document-template-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TEMPLATE_TYPES, type PdfmeTemplate, type TemplateType } from "@/lib/pdf-templates/definitions";
import charter from "@/settings/charter";

type Props = {
  id: string;
  type: TemplateType;
  initialName: string;
  initialTemplate: PdfmeTemplate;
  editionLabel: string;
  isActive: boolean;
};

function base64ToBlobUrl(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

export function DocumentTemplateEditor({ id, type, initialName, initialTemplate, editionLabel, isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<Designer | null>(null);
  const [name, setName] = useState(initialName);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isPreviewing, startPreviewing] = useTransition();
  const definition = TEMPLATE_TYPES[type];

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      try {
        // Chargé à la demande : l'éditeur est lourd et inutile ailleurs dans l'application.
        const [{ Designer }, schemas] = await Promise.all([import("@pdfme/ui"), import("@pdfme/schemas")]);
        if (cancelled) return;
        designerRef.current = new Designer({
          domContainer: container,
          template: initialTemplate as never,
          plugins: {
            text: schemas.text,
            image: schemas.image,
            qrcode: schemas.barcodes.qrcode,
            rectangle: schemas.rectangle,
            ellipse: schemas.ellipse,
            line: schemas.line,
          } as never,
          options: { lang: "fr" } as never,
        });
        setReady(true);
      } catch (error) {
        console.error(error);
        if (!cancelled) setLoadError("Impossible de charger l'éditeur. Rechargez la page.");
      }
    })();

    return () => {
      cancelled = true;
      designerRef.current?.destroy();
      designerRef.current = null;
    };
    // Le modèle initial n'est lu qu'une fois : l'éditeur garde ensuite l'état des modifications.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const currentTemplate = () => designerRef.current?.getTemplate() as unknown as PdfmeTemplate | undefined;

  const save = () => {
    const template = currentTemplate();
    if (!template) return;
    startSaving(async () => {
      try {
        await saveDocumentTemplateAction(id, { name, template });
        toast.success(isActive ? "Modèle enregistré — il s'applique aux prochains documents" : "Modèle enregistré");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer");
      }
    });
  };

  const preview = () => {
    const template = currentTemplate();
    if (!template) return;
    startPreviewing(async () => {
      try {
        const { base64 } = await previewDocumentTemplateAction(type, template);
        setPreviewUrl(base64ToBlobUrl(base64));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Aperçu impossible");
      }
    });
  };

  const copyVariable = async (key: string) => {
    try {
      await navigator.clipboard.writeText(`{${key}}`);
      toast.success(`{${key}} copié : collez-le dans un bloc de texte`);
    } catch {
      toast.error("Copie impossible : saisissez la variable à la main");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-3" style={{ borderColor: charter.border }}>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/modeles-documents" />}>
          <ArrowLeft /> Retour
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {definition.label} — {editionLabel}
            {isActive && <span className="ml-2 font-semibold" style={{ color: charter.green }}>• Actif</span>}
          </p>
          <Input value={name} onChange={event => setName(event.target.value)} className="h-8 max-w-sm" aria-label="Nom du modèle" />
        </div>
        <Button variant="outline" onClick={preview} loading={isPreviewing} disabled={!ready || isSaving}>
          <Eye /> Aperçu
        </Button>
        <Button onClick={save} loading={isSaving} disabled={!ready || isPreviewing}>
          <Save /> Enregistrer
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r bg-white p-4 lg:block" style={{ borderColor: charter.border }}>
          <h3 className="text-sm font-semibold">Variables</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cliquez pour copier, puis collez dans un bloc de texte (ex. « Bonjour {"{ambassadorName}"} »). Elles sont remplacées
            à la génération.
          </p>
          <ul className="mt-3 space-y-2">
            {definition.variables.map(variable => (
              <li key={variable.key}>
                <button
                  type="button"
                  onClick={() => copyVariable(variable.key)}
                  className="group w-full border px-2.5 py-2 text-left transition-colors hover:bg-muted"
                  style={{ borderColor: charter.border }}
                >
                  <span className="flex items-center justify-between gap-2 font-mono text-xs" style={{ color: charter.orangeDark }}>
                    {`{${variable.key}}`}
                    <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{variable.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Les blocs <strong>Code QR</strong> acceptent aussi une variable (ex. le numéro du badge).
          </p>
        </aside>

        <div className="relative min-w-0 flex-1 bg-muted/30">
          {!ready && !loadError && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Chargement de l&apos;éditeur…</p>
          )}
          {loadError && <p className="absolute inset-0 flex items-center justify-center text-sm text-red-700">{loadError}</p>}
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>

      <Dialog open={previewUrl !== null} onOpenChange={open => !open && setPreviewUrl(null)}>
        <DialogContent className="flex max-h-[94vh] flex-col overflow-hidden rounded-none sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Aperçu — {definition.label}</DialogTitle>
            <DialogDescription>Généré avec des données d&apos;exemple, par le même moteur que les vrais documents.</DialogDescription>
          </DialogHeader>
          {previewUrl && <iframe src={previewUrl} title="Aperçu du modèle" className="h-[70vh] w-full border bg-muted" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
