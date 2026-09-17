import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { getQuizResultsAction } from "@/actions/quiz-attempt-actions";
import charter from "@/settings/charter";

export async function QuizResults({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  const { attempts, stats } = await getQuizResultsAction(quizId);

  return (
    <section className="space-y-6">
      <div>
        <Link
          href={`/admin/qcm/${quizId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour au QCM
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Résultats — {quizTitle}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tentatives terminées" value={String(stats.total)} />
        <StatCard label="Taux de réussite" value={`${stats.passRate.toFixed(0)}%`} />
        <StatCard label="Moyenne" value={`${stats.average.toFixed(1)}%`} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">#</th>
                <th className="px-5 py-4">Candidat</th>
                <th className="px-5 py-4">Région</th>
                <th className="px-5 py-4">Score</th>
                <th className="px-5 py-4">Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attempts.map((attempt, index) => (
                <tr key={attempt.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-5 py-4 text-muted-foreground">{index + 1}</td>
                  <td className="px-5 py-4 font-medium">
                    {attempt.ambassadorApplication.firstName} {attempt.ambassadorApplication.lastName}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {attempt.ambassadorApplication.region.name}
                  </td>
                  <td className="px-5 py-4">
                    {attempt.score ?? 0} / {attempt.totalPoints ?? 0} —{" "}
                    <span className="font-semibold" style={{ color: charter.orange }}>
                      {(attempt.percentage ?? 0).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {attempt.passed ? (
                      <span className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle2 className="h-4 w-4" /> Admis
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-destructive">
                        <XCircle className="h-4 w-4" /> Non admis
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    Aucune tentative terminée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
      <p className="text-3xl font-bold" style={{ color: charter.orange }}>
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
