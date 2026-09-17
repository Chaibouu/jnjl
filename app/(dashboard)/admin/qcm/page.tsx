import { listQuizzesAction } from "@/actions/quiz-actions";
import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { QuizManager } from "@/components/admin/QuizManager";

export default async function QuizzesPage() {
  const [quizzes, editions] = await Promise.all([
    listQuizzesAction(),
    listEditionsForSelectAction(),
  ]);
  return <QuizManager quizzes={quizzes} editions={editions} />;
}
