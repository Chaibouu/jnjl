import Link from "next/link";
import { CheckCircle2, Clock, FileQuestion, XCircle } from "lucide-react";
import { getMyQuizStatusAction } from "@/actions/quiz-attempt-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

export default async function MyQuizPage() {
  const status = await getMyQuizStatusAction();

  if (!status) {
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

  const { quiz, attemptsUsed, attemptsRemaining, inProgressAttemptId, lastCompletedAttempt } = status;

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Formation Ambassadeurs
        </p>
        <h1 className="mt-1 text-2xl font-bold">{quiz.title}</h1>
        {quiz.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{quiz.description}</p>
        )}

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
              render={<Link href="/ambassadeur/qcm/passer" />}
            >
              Reprendre le QCM
            </Button>
          ) : attemptsRemaining > 0 ? (
            <Button
              nativeButton={false}
              className="h-11 w-full text-white transition-opacity hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: charter.orange }}
              render={<Link href="/ambassadeur/qcm/passer" />}
            >
              Commencer le QCM
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous avez utilisé toutes vos tentatives pour ce QCM.
            </p>
          )}
        </div>
      </div>
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
