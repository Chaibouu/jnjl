"use client";

import { useState, useTransition } from "react";
import { Award, FileText } from "lucide-react";
import {
  issueAllCertificatesAction,
  issueCertificateAction,
  listCertificateCandidatesAction,
} from "@/actions/certificate-actions";
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
type Candidate = Awaited<ReturnType<typeof listCertificateCandidatesAction>>[number];

export function CertificatesManager({
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

  const run = (task: () => Promise<string | void>) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const success = await task();
        if (success) setMessage(success);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    run(async () => {
      setCandidates(await listCertificateCandidatesAction(value));
    });
  };

  const issue = (applicationId: string) =>
    run(async () => {
      await issueCertificateAction(applicationId);
      setCandidates(await listCertificateCandidatesAction(editionId));
      return "Attestation générée";
    });

  const issueAll = () =>
    run(async () => {
      const result = await issueAllCertificatesAction(editionId);
      setCandidates(await listCertificateCandidatesAction(editionId));
      return `${result.count} attestation(s) générée(s)${result.skipped ? `, ${result.skipped} ignorée(s)` : ""}`;
    });

  const pendingCount = candidates.filter(candidate => !candidate.certificate).length;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Ambassadeurs</p>
          <h1 className="mt-1 text-3xl font-bold">Attestation de participation JNJL</h1>
          <p className="mt-2 text-muted-foreground">
            Document officiel délivré en fin de parcours, une fois l&apos;ambassadeur pointé présent
            à l&apos;événement — à ne pas confondre avec les attestations de formation ci-dessous,
            liées à chaque module.
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

      <div>
        <Button
          type="button"
          loading={isPending} disabled={pendingCount === 0}
          onClick={issueAll}
          className="rounded-none px-4 text-white shadow-sm hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: charter.orange }}
        >
          <Award className="mr-2 h-4 w-4" />
          Générer pour tous ({pendingCount})
        </Button>
      </div>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="divide-y">
          {candidates.map(candidate => (
            <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-medium">
                  {candidate.firstName} {candidate.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {candidate.email} · {candidate.region.name}
                </p>
              </div>
              {candidate.certificate ? (
                <a
                  href={candidate.certificate.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium underline"
                  style={{ color: charter.orange }}
                >
                  <FileText className="h-4 w-4" />
                  Voir l&apos;attestation
                </a>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => issue(candidate.id)}
                  className="rounded-none"
                >
                  Générer l&apos;attestation
                </Button>
              )}
            </div>
          ))}
          {candidates.length === 0 && (
            <p className="px-5 py-12 text-center text-muted-foreground">
              Aucun ambassadeur n&apos;a encore été pointé présent.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
