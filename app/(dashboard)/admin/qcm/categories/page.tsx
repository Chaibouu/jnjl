import { listQuestionCategoriesAction } from "@/actions/question-category-actions";
import { QuestionCategoryManager } from "@/components/admin/QuestionCategoryManager";

export default async function QuestionCategoriesPage() {
  const categories = await listQuestionCategoriesAction();
  return <QuestionCategoryManager categories={categories} />;
}
