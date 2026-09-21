import { redirect } from "next/navigation";
import { getMyQuizStatusAction, startQuizAttemptAction } from "@/actions/quiz-attempt-actions";
import { QuizPlayer } from "@/components/ambassador/QuizPlayer";

export const dynamic = "force-dynamic";

export default async function PasserQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ quiz?: string }>;
}) {
  const { quiz: quizId } = await searchParams;
  const status = await getMyQuizStatusAction();
  const item = status?.quizzes.find(entry => entry.quiz.id === quizId);

  if (
    !item ||
    !item.gate.unlocked ||
    (!item.inProgressAttemptId && item.attemptsRemaining === 0)
  ) {
    redirect("/ambassadeur/qcm");
  }

  const attempt = await startQuizAttemptAction(item.quiz.id);

  return <QuizPlayer initialAttempt={attempt} />;
}
