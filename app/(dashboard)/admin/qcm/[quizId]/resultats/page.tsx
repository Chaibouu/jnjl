import { getQuizAction } from "@/actions/quiz-actions";
import { QuizResults } from "@/components/admin/QuizResults";

export default async function QuizResultsPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const quiz = await getQuizAction(quizId);
  return <QuizResults quizId={quizId} quizTitle={quiz.title} />;
}
