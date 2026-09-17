import Link from "next/link";
import { getQuestionAction } from "@/actions/question-actions";
import { listQuestionCategoriesAction } from "@/actions/question-category-actions";
import { QuestionForm } from "@/components/admin/QuestionForm";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  const [question, categories] = await Promise.all([
    getQuestionAction(questionId),
    listQuestionCategoriesAction(),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/admin/qcm/questions"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour à la banque de questions
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Modifier la question</h1>
      </div>
      <QuestionForm question={question} categories={categories} />
    </section>
  );
}
