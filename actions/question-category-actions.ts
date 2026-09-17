"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import {
  questionCategorySchema,
  type QuestionCategoryInput,
} from "@/schemas/question-category";

export async function listQuestionCategoriesAction() {
  await requirePermission("quiz.manage");
  return db.questionCategory.findMany({
    where: { isDeleted: false },
    include: { _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createQuestionCategoryAction(input: QuestionCategoryInput) {
  await requirePermission("quiz.manage");
  const data = questionCategorySchema.parse(input);
  await assertUniqueName(data.name);

  return db.questionCategory.create({
    data: { name: data.name, description: emptyToNull(data.description) },
  });
}

export async function updateQuestionCategoryAction(
  id: string,
  input: QuestionCategoryInput
) {
  await requirePermission("quiz.manage");
  const data = questionCategorySchema.parse(input);
  await assertUniqueName(data.name, id);

  return db.questionCategory.update({
    where: { id },
    data: { name: data.name, description: emptyToNull(data.description) },
  });
}

export async function deleteQuestionCategoryAction(id: string) {
  await requirePermission("quiz.manage");
  const referenced = await db.question.count({
    where: { categoryId: id, isDeleted: false },
  });
  if (referenced > 0) {
    throw new Error("Cette catégorie contient des questions et ne peut pas être supprimée");
  }
  await db.questionCategory.update({ where: { id }, data: { isDeleted: true } });
}

async function assertUniqueName(name: string, excludeId?: string) {
  const conflict = await db.questionCategory.findFirst({
    where: { name, isDeleted: false, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  if (conflict) throw new Error("Une catégorie porte déjà ce nom");
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}
