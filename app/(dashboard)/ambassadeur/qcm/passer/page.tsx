import { redirect } from "next/navigation";
import { getMyQuizStatusAction, startQuizAttemptAction } from "@/actions/quiz-attempt-actions";
import { QuizPlayer } from "@/components/ambassador/QuizPlayer";

export const dynamic = "force-dynamic";

export default async function PasserQuizPage() {
  const status = await getMyQuizStatusAction();
  if (!status || (!status.inProgressAttemptId && status.attemptsRemaining === 0)) {
    redirect("/ambassadeur/qcm");
  }

  const attempt = await startQuizAttemptAction(status.quiz.id);

  return <QuizPlayer initialAttempt={attempt} />;
}
