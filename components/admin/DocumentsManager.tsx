"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Upload } from "lucide-react";
import {
  advanceToEngagementAction,
  listDocumentCandidatesAction,
  uploadAmbassadorDocumentAction,
} from "@/actions/document-actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };
type DocumentItem = { id: string; type: string; fileUrl: string; generatedAt: Date };
type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  stage: string;
  region: { id: string; name: string; code: string };
  documents: DocumentItem[];
};

const DOCUMENT_SLOTS: { type: string; label: string }[] = [
  { type: "PERMISSION_REQUEST", label: "Demande de permission" },
  { type: "MISSION_ORDER", label: "Ordre de mission" },
];

export function DocumentsManager({
  editions,
  initialEditionId,
  initialCandidates,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialCandidates: Candidate[];
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const refresh = (newEditionId: string, successMessage?: string) => {
    setError("");
    startTransition(async () => {
      try {
        setCandidates(await listDocumentCandidatesAction(newEditionId));
        if (successMessage) setMessage(successMessage);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    setMessage("");
    refresh(value);
  };

  const upload = (applicationId: string, type: string, file: File) => {
    setMessage("");
    setError("");
    const formData = new FormData();
    formData.set("applicationId", applicationId);
    formData.set("type", type);
    formData.set("file", file);
    startTransition(async () => {
      try {
        await uploadAmbassadorDocumentAction(formData);
        refresh(editionId, "Document téléversé");
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const advance = (applicationId: string) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await advanceToEngagementAction(applicationId);
        refresh(editionId, "Candidat passé à l'étape Engagement");
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const grouped = candidates.reduce<Record<string, Candidate[]>>((groups, candidate) => {
    (groups[candidate.region.id] ??= []).push(candidate);
    return groups;
  }, {});

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Ambassadeurs
          </p>
          <h1 className="mt-1 text-3xl font-bold">Documents</h1>
          <p className="mt-2 text-muted-foreground">
            Générez la demande de permission et l&apos;ordre de mission avant l&apos;engagement.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={editionId} onValueChange={changeEdition}>
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir une édition">
                {(value: string) => {
                  const edition = editions.find(item => item.id === value);
                  return edition ? `${edition.name} (${edition.year})` : "Choisir une édition";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {editions.map(edition => (
                <SelectItem key={edition.id} value={edition.id}>
                  {edition.name} ({edition.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      {Object.keys(grouped).length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          Aucun candidat éligible pour l&apos;instant (il doit être sélectionné et avoir franchi le repêchage).
        </div>
      )}

      {Object.entries(grouped).map(([regionId, items]) => (
        <div key={regionId} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">{items[0].region.name}</h2>
          </div>
          <div className="divide-y">
            {items.map(candidate => {
              const complete = DOCUMENT_SLOTS.every(slot =>
                candidate.documents.some(doc => doc.type === slot.type)
              );
              return (
                <div key={candidate.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {candidate.firstName} {candidate.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{candidate.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {DOCUMENT_SLOTS.map(slot => {
                      const doc = candidate.documents.find(item => item.type === slot.type);
                      return (
                        <DocumentSlot
                          key={slot.type}
                          label={slot.label}
                          document={doc}
                          disabled={isPending}
                          onUpload={file => upload(candidate.id, slot.type, file)}
                        />
                      );
                    })}
                    <Button
                      type="button"
                      disabled={isPending || !complete}
                      onClick={() => advance(candidate.id)}
                      className="rounded-none text-white hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: charter.orange }}
                    >
                      Passer à l&apos;engagement
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function DocumentSlot({
  label,
  document,
  disabled,
  onUpload,
}: {
  label: string;
  document?: DocumentItem;
  disabled: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 rounded-none border border-border bg-muted/30 px-3 py-2 text-sm">
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        {document ? (
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium underline"
            style={{ color: charter.orange }}
          >
            Voir le fichier
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">Non fourni</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        title={document ? "Remplacer" : "Téléverser"}
      >
        <Upload className="h-4 w-4" />
      </Button>
    </div>
  );
}
