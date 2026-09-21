"use client";

import { useState, useTransition } from "react";
import { Award, FileText } from "lucide-react";
import {
  issueAllTrainingCertificatesAction,
  issueTrainingCertificateAction,
  listTrainingCertificateCandidatesAction,
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

type CourseOption = { id: string; title: string; edition: { name: string; year: number } };
type Data = Awaited<ReturnType<typeof listTrainingCertificateCandidatesAction>>;

export function TrainingCertificatesManager({
  courses,
  initialCourseId,
  initialData,
}: {
  courses: CourseOption[];
  initialCourseId: string;
  initialData: Data | null;
}) {
  const [courseId, setCourseId] = useState(initialCourseId);
  const [data, setData] = useState(initialData);
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

  const changeCourse = (value: string | null) => {
    if (!value) return;
    setCourseId(value);
    run(async () => {
      setData(await listTrainingCertificateCandidatesAction(value));
    });
  };

  const issue = (applicationId: string) =>
    run(async () => {
      await issueTrainingCertificateAction(courseId, applicationId);
      setData(await listTrainingCertificateCandidatesAction(courseId));
      return "Attestation générée";
    });

  const issueAll = () =>
    run(async () => {
      const result = await issueAllTrainingCertificatesAction(courseId);
      setData(await listTrainingCertificateCandidatesAction(courseId));
      return `${result.count} attestation(s) générée(s)${result.skipped ? `, ${result.skipped} ignorée(s)` : ""}`;
    });

  const pendingCount = data?.candidates.filter(item => item.eligible && !item.certificate).length ?? 0;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Formations</p>
          <h2 className="mt-1 text-2xl font-bold">Attestations de formation</h2>
          <p className="mt-2 text-muted-foreground">
            Éligibles : modules terminés et QCM lié(s) réussi(s). L&apos;attestation est délivrée par vos soins.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Select value={courseId} onValueChange={changeCourse}>
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir une formation">
                {(value: string) => {
                  const course = courses.find(item => item.id === value);
                  return course ? `${course.title} (${course.edition.year})` : "Choisir une formation";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title} ({course.edition.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {courses.length === 0 ? (
        <p className="rounded-2xl border bg-card px-5 py-10 text-center text-muted-foreground shadow-sm">
          Aucune formation ne délivre d&apos;attestation. Activez « Délivre une attestation » sur une formation.
        </p>
      ) : (
        <>
          <div>
            <Button
              type="button"
              loading={isPending} disabled={pendingCount === 0}
              onClick={issueAll}
              className="rounded-none px-4 text-white shadow-sm hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: charter.orange }}
            >
              <Award className="mr-2 h-4 w-4" />
              Générer pour tous les éligibles ({pendingCount})
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
              {data?.candidates.map(candidate => (
                <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-medium">
                      {candidate.firstName} {candidate.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.email} · {candidate.region.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Modules {candidate.modulesDone}/{data.modulesTotal}
                      {data.quizzesTotal > 0 ? ` · QCM réussis ${candidate.quizzesPassed}/${data.quizzesTotal}` : ""}
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
                  ) : candidate.eligible ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => issue(candidate.id)}
                      className="rounded-none"
                    >
                      Générer l&apos;attestation
                    </Button>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      Pas encore éligible
                    </span>
                  )}
                </div>
              ))}
              {(data?.candidates.length ?? 0) === 0 && (
                <p className="px-5 py-12 text-center text-muted-foreground">
                  Personne n&apos;a encore commencé cette formation.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
