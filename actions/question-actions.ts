"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { questionSchema, type QuestionInput } from "@/schemas/question";

export async function listQuestionsAction(filters?: { categoryId?: string; search?: string }) {
  await requirePermission("quiz.manage");
  return db.question.findMany({
    where: {
      isDeleted: false,
      categoryId: filters?.categoryId || undefined,
      text: filters?.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    },
    include: {
      category: { select: { id: true, name: true } },
      options: { orderBy: { position: "asc" } },
      _count: { select: { quizQuestions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuestionAction(id: string) {
  await requirePermission("quiz.manage");
  const question = await db.question.findFirst({
    where: { id, isDeleted: false },
    include: { options: { orderBy: { position: "asc" } } },
  });
  if (!question) throw new Error("Question introuvable");
  return question;
}

export async function createQuestionAction(input: QuestionInput) {
  await requirePermission("quiz.manage");
  const data = questionSchema.parse(input);

  return db.question.create({
    data: {
      categoryId: data.categoryId,
      type: data.type,
      text: data.text,
      explanation: emptyToNull(data.explanation),
      points: data.points,
      isActive: data.isActive,
      options: {
        create: data.options.map((option, index) => ({
          text: option.text,
          isCorrect: option.isCorrect,
          position: index,
        })),
      },
    },
  });
}

export async function updateQuestionAction(id: string, input: QuestionInput) {
  await requirePermission("quiz.manage");
  const data = questionSchema.parse(input);

  const existing = await db.question.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new Error("Question introuvable");

  return db.$transaction(async transaction => {
    await transaction.questionOption.deleteMany({ where: { questionId: id } });
    return transaction.question.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        type: data.type,
        text: data.text,
        explanation: emptyToNull(data.explanation),
        points: data.points,
        isActive: data.isActive,
        options: {
          create: data.options.map((option, index) => ({
            text: option.text,
            isCorrect: option.isCorrect,
            position: index,
          })),
        },
      },
    });
  });
}

export async function deleteQuestionAction(id: string) {
  await requirePermission("quiz.manage");
  const referenced = await db.quizQuestion.count({ where: { questionId: id } });
  if (referenced > 0) {
    throw new Error("Cette question est utilisée dans un QCM et ne peut pas être supprimée");
  }
  await db.question.update({ where: { id }, data: { isDeleted: true } });
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}
