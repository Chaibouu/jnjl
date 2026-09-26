"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createDocumentTemplateAction,
  deleteDocumentTemplateAction,
  listDocumentTemplatesAction,
  setDocumentTemplateActiveAction,
} from "@/actions/document-template-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEMPLATE_TYPES, TEMPLATE_TYPE_KEYS, type TemplateType } from "@/lib/pdf-templates/definitions";
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };
type TemplateRow = Awaited<ReturnType<typeof listDocumentTemplatesAction>>[number];

const DEFAULT_SOURCE = "__default__";

export function DocumentTemplatesManager({
  editions,
  initialEditionId,
  initialTemplates,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialTemplates: TemplateRow[];
}) {
  const { confirm } = useConfirm();
  const [editionId, setEditionId] = useState(initialEditionId);
  const [templates, setTemplates] = useState(initialTemplates);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [creating, setCreating] = useState<TemplateType | null>(null);
  const [newName, setNewName] = useState("");
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [createError, setCreateError] = useState("");

  const reload = async () => setTemplates(await listDocumentTemplatesAction());

  const run = (id: string | null, task: () => Promise<void>) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        await task();
        await reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
      } finally {
        setBusyId(null);
      }
    });
  };

  const toggleActive = (template: TemplateRow) =>
    run(template.id, async () => {
      await setDocumentTemplateActiveAction(template.id, !template.isActive);
      toast.success(template.isActive ? "Modèle désactivé : mise en page standard rétablie" : "Modèle activé");
    });

  const remove = async (template: TemplateRow) => {
    const ok = await confirm({
      title: "Supprimer ce modèle ?",
      description: `« ${template.name} » sera supprimé définitivement. Les PDF déjà émis ne sont pas modifiés.`,
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    run(template.id, async () => {
      await deleteDocumentTemplateAction(template.id);
      toast.success("Modèle supprimé");
    });
  };

  const openCreate = (type: TemplateType) => {
    setCreating(type);
    setNewName(`${TEMPLATE_TYPES[type].label} ${editions.find(e => e.id === editionId)?.year ?? ""}`.trim());
    setSource(DEFAULT_SOURCE);
    setCreateError("");
  };

  const create = () => {
    if (!creating) return;
    setCreateError("");
    startTransition(async () => {
      try {
        const { id } = await createDocumentTemplateAction({
          editionId,
          type: creating,
          name: newName,
          copyFromId: source === DEFAULT_SOURCE ? null : source,
        });
        // Ouvre directement l'éditeur sur le nouveau modèle.
        window.location.href = `/admin/modeles-documents/${id}`;
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "Impossible de créer le modèle");
      }
    });
  };

  const ofEdition = templates.filter(template => template.editionId === editionId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Modèles de documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisez la mise en page des PDF (engagement, attestations, badge) pour chaque édition. Tant qu&apos;aucun modèle
          n&apos;est <strong>actif</strong>, la mise en page standard est utilisée. Un modèle ne s&apos;applique qu&apos;aux
          documents générés <strong>après</strong> son activation.
        </p>
      </div>

      <Field className="max-w-xs">
        <FieldLabel>Édition</FieldLabel>
        <Select value={editionId} onValueChange={value => value && setEditionId(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {editions.map(edition => (
              <SelectItem key={edition.id} value={edition.id}>
                {edition.name} ({edition.year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        {TEMPLATE_TYPE_KEYS.map(type => {
          const definition = TEMPLATE_TYPES[type];
          const rows = ofEdition.filter(template => template.type === type);
          const hasActive = rows.some(row => row.isActive);
          return (
            <section key={type} className="flex flex-col border bg-white p-5 shadow-sm" style={{ borderColor: charter.border }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{definition.label}</h2>
                  <p className="text-xs text-muted-foreground">{definition.description}</p>
                </div>
                <span
                  className="shrink-0 px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: hasActive ? `${charter.green}22` : "#F1F1F3",
                    color: hasActive ? charter.green : "#6b6b6b",
                  }}
                >
                  {hasActive ? "Modèle personnalisé" : "Mise en page standard"}
                </span>
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {rows.length === 0 && <li className="text-sm text-muted-foreground">Aucun modèle pour cette édition.</li>}
                {rows.map(row => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border px-3 py-2" style={{ borderColor: charter.border }}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Modifié le {new Date(row.updatedAt).toLocaleDateString("fr-FR")}
                        {row.isActive && (
                          <span className="ml-2 inline-flex items-center gap-1 font-semibold" style={{ color: charter.green }}>
                            <CheckCircle2 className="h-3 w-3" /> Actif
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/admin/modeles-documents/${row.id}`} />}>
                        <Pencil /> Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant={row.isActive ? "outline" : "default"}
                        loading={busyId === row.id && isPending}
                        disabled={isPending}
                        onClick={() => toggleActive(row)}
                      >
                        <Power /> {row.isActive ? "Désactiver" : "Activer"}
                      </Button>
                      <Button size="icon-sm" variant="cancel" aria-label="Supprimer" disabled={isPending} onClick={() => remove(row)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <Button className="mt-4 self-start" size="sm" onClick={() => openCreate(type)} disabled={isPending}>
                <Plus /> Nouveau modèle
              </Button>
            </section>
          );
        })}
      </div>

      <Dialog open={creating !== null} onOpenChange={open => !open && setCreating(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau modèle{creating ? ` — ${TEMPLATE_TYPES[creating].label}` : ""}</DialogTitle>
            <DialogDescription>
              Le modèle est créé inactif : vous pourrez le modifier, le prévisualiser puis l&apos;activer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>Nom du modèle</FieldLabel>
              <Input value={newName} onChange={event => setNewName(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Point de départ</FieldLabel>
              <Select value={source} onValueChange={value => value && setSource(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_SOURCE}>Mise en page standard de la JNJL</SelectItem>
                  {templates
                    .filter(template => creating && template.type === creating)
                    .map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <Copy className="mr-1 inline h-3 w-3" />
                        Copie de « {template.name} » ({template.edition.year})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            {createError && <p className="bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="cancel" onClick={() => setCreating(null)} disabled={isPending}>
              Annuler
            </Button>
            <Button loading={isPending} onClick={create}>
              Créer et ouvrir l&apos;éditeur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
