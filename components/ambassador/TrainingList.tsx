"use client";

import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Circle, FileText, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

type ModuleItem = {
  id: string;
  title: string;
  hasVideo: boolean;
  startedAt: string | null;
  completedAt: string | null;
};

type QuizItem = { id: string; title: string; passed: boolean };

/**
 * Une formation et ses modules. Un module s'ouvre dans le lecteur
 * (/ambassadeur/formation/[id]) : c'est là qu'il est lu, puis marqué comme terminé.
 */
export function TrainingList({
  title,
  description,
  isRequired,
  hasCertificate,
  quizzes,
  certificate,
  items,
}: {
  title: string;
  description: string | null;
  isRequired: boolean;
  hasCertificate: boolean;
  quizzes: QuizItem[];
  certificate: { fileUrl: string; generatedAt: string } | null;
  items: ModuleItem[];
}) {
  const completedCount = items.filter(item => item.completedAt).length;
  const allCompleted = items.length > 0 && completedCount === items.length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          {isRequired && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Obligatoire
            </span>
          )}
          {hasCertificate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Award className="h-3 w-3" />
              Attestation
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-semibold">{completedCount} / {items.length}</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: charter.orange }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {items.map((module, index) => {
          const status = module.completedAt ? "done" : module.startedAt ? "started" : "new";
          return (
            <div
              key={module.id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                {status === "done" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {index + 1}. {module.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {module.hasVideo && (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        Vidéo ·{" "}
                      </>
                    )}
                    {status === "done" ? "Terminé" : status === "started" ? "En cours de lecture" : "Non commencé"}
                  </p>
                </div>
              </div>
              <Button
                nativeButton={false}
                variant={status === "done" ? "outline" : "default"}
                className="shrink-0"
                render={<Link href={`/ambassadeur/formation/${module.id}`} />}
              >
                <BookOpen className="mr-1.5 h-4 w-4" />
                {status === "done" ? "Relire" : status === "started" ? "Reprendre" : "Ouvrir le module"}
              </Button>
            </div>
          );
        })}
      </div>

      {allCompleted && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="h-8 w-8" style={{ color: charter.orange }} />
          <p className="font-semibold">Formation terminée !</p>

          {quizzes.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {quizzes.every(quiz => quiz.passed)
                  ? "Vous avez réussi le QCM de cette formation."
                  : "Passez maintenant le QCM qui clôture cette formation."}
              </p>
              <Button nativeButton={false} render={<Link href="/ambassadeur/qcm" />}>
                Accéder au QCM
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun QCM n&apos;est rattaché à cette formation.</p>
          )}

          {hasCertificate &&
            (certificate ? (
              <a
                href={certificate.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
                style={{ color: charter.orange }}
              >
                <FileText className="h-4 w-4" />
                Télécharger mon attestation
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">
                Votre attestation sera délivrée par l&apos;administration
                {quizzes.length > 0 ? " une fois le QCM réussi" : ""}.
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
