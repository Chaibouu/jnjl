import { getQuizAction } from "@/actions/quiz-actions";
import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listQuestionsAction } from "@/actions/question-actions";
import { QuizBuilder } from "@/components/admin/QuizBuilder";

export default async function QuizBuilderPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const [quiz, editions, questions] = await Promise.all([
    getQuizAction(quizId),
    listEditionsForSelectAction(),
    listQuestionsAction(),
  ]);

  const bankQuestions = questions
    .filter(question => question.isActive)
    .map(question => ({
      id: question.id,
      text: question.text,
      points: question.points,
      category: question.category,
    }));

  return <QuizBuilder quiz={quiz} editions={editions} bankQuestions={bankQuestions} />;
}
