import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { getAttemptResultAction } from "@/actions/quiz-attempt-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

export default async function QuizResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const result = await getAttemptResultAction(attemptId);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        {result.showScore ? (
          <>
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                backgroundColor: result.passed ? "#dcfce7" : "#fee2e2",
              }}
            >
              {result.passed ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold">
              {result.passed ? "Félicitations, vous avez réussi !" : "Score insuffisant"}
            </h1>
            <p className="mt-2 text-muted-foreground">{result.quizTitle}</p>
            <p className="mt-4 text-4xl font-bold" style={{ color: charter.orange }}>
              {(result.percentage ?? 0).toFixed(0)}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.score} / {result.totalPoints} points
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="mt-4 text-2xl font-bold">QCM soumis</h1>
            <p className="mt-2 text-muted-foreground">
              Votre réponse a bien été enregistrée. Le résultat vous sera communiqué ultérieurement.
            </p>
          </>
        )}
      </div>

      {result.details.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Corrections</h2>
          {result.details.map(detail => (
            <div key={detail.questionId} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-2">
                {detail.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <p className="text-sm font-medium">{detail.text}</p>
              </div>
              <ul className="mt-3 space-y-1.5 pl-6 text-sm">
                {detail.options.map(option => (
                  <li
                    key={option.id}
                    className={
                      option.isCorrect
                        ? "font-semibold text-green-700"
                        : detail.selectedOptionIds.includes(option.id)
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {option.text}
                    {option.isCorrect && " (bonne réponse)"}
                  </li>
                ))}
              </ul>
              {detail.explanation && (
                <p className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  {detail.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="rounded-none"
        nativeButton={false}
        render={<Link href="/ambassadeur/qcm" />}
      >
        Retour
      </Button>
    </section>
  );
}
