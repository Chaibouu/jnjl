import { listQuestionsAction } from "@/actions/question-actions";
import { listQuestionCategoriesAction } from "@/actions/question-category-actions";
import { QuestionManager } from "@/components/admin/QuestionManager";

export default async function QuestionsPage() {
  const [questions, categories] = await Promise.all([
    listQuestionsAction(),
    listQuestionCategoriesAction(),
  ]);
  return <QuestionManager questions={questions} categories={categories} />;
}
