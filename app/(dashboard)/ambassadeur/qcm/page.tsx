import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileQuestion,
  GraduationCap,
  Lock,
  XCircle,
} from "lucide-react";
import { getMyQuizStatusAction } from "@/actions/quiz-attempt-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

export default async function MyQuizPage() {
  const status = await getMyQuizStatusAction();

  if (!status || status.quizzes.length === 0) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Aucun QCM disponible</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucun QCM n&apos;est actuellement publié pour votre candidature, ou votre candidature
            n&apos;est pas encore associée à un compte.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Parcours ambassadeur
        </p>
        <h1 className="mt-1 text-2xl font-bold">Mes QCM</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Certains QCM suivent une formation : terminez-la d&apos;abord pour les débloquer.
        </p>
      </div>

      {status.quizzes.map(item => {
        const { quiz, gate, attemptsUsed, attemptsRemaining, inProgressAttemptId, lastCompletedAttempt } = item;
        const startHref = `/ambassadeur/qcm/passer?quiz=${quiz.id}`;

        return (
          <div key={quiz.id} className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {quiz.course && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Suite de : {quiz.course.title}
                </span>
              )}
              {quiz.countsForRanking && (
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: charter.orange }}
                >
                  Compte pour le classement
                </span>
              )}
            </div>
            <h2 className="mt-2 text-xl font-bold">{quiz.title}</h2>
            {quiz.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{quiz.description}</p>
            )}

            {!gate.unlocked ? (
              <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4" />
                  QCM verrouillé
                </div>
                <p className="text-sm text-muted-foreground">
                  {gate.kind === "course" && gate.courseTitle
                    ? `Terminez la formation « ${gate.courseTitle} » : `
                    : "Terminez vos formations obligatoires : "}
                  {gate.completedCount} / {gate.totalCount} modules terminés.
                </p>
                <Button
                  nativeButton={false}
                  className="rounded-none text-white hover:opacity-90"
                  style={{ backgroundColor: charter.orange }}
                  render={<Link href="/ambassadeur/formation" />}
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Accéder à ma formation
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-3">
                  <InfoTile icon={FileQuestion} label="Questions" value={String(quiz._count.questions)} />
                  {quiz.durationMinutes && (
                    <InfoTile icon={Clock} label="Durée" value={`${quiz.durationMinutes} min`} />
                  )}
                  <InfoTile
                    label="Tentatives"
                    value={`${attemptsUsed} / ${quiz.maxAttempts}`}
                    icon={FileQuestion}
                  />
                </div>

                {lastCompletedAttempt && (
                  <div className="mt-6 flex items-center gap-3 rounded-xl border p-4">
                    {lastCompletedAttempt.passed ? (
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 shrink-0 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">
                        {lastCompletedAttempt.passed ? "Vous avez réussi ce QCM" : "Score insuffisant"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Score : {(lastCompletedAttempt.percentage ?? 0).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  {inProgressAttemptId ? (
                    <Button
                      nativeButton={false}
                      className="h-11 w-full text-white transition-opacity hover:opacity-90 sm:w-auto"
                      style={{ backgroundColor: charter.orange }}
                      render={<Link href={startHref} />}
                    >
                      Reprendre le QCM
                    </Button>
                  ) : attemptsRemaining > 0 ? (
                    <Button
                      nativeButton={false}
                      className="h-11 w-full text-white transition-opacity hover:opacity-90 sm:w-auto"
                      style={{ backgroundColor: charter.orange }}
                      render={<Link href={startHref} />}
                    >
                      Commencer le QCM
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Vous avez utilisé toutes vos tentatives pour ce QCM.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
