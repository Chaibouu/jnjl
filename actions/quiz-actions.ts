"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { quizSchema, type QuizInput } from "@/schemas/quiz";

export async function listQuizzesAction() {
  await requirePermission("quiz.manage");
  return db.quiz.findMany({
    include: {
      edition: { select: { id: true, name: true, year: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuizAction(id: string) {
  await requirePermission("quiz.manage");
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      edition: { select: { id: true, name: true, year: true } },
      questions: {
        include: {
          question: {
            include: { category: { select: { id: true, name: true } }, options: true },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!quiz) throw new Error("QCM introuvable");
  return quiz;
}

export async function createQuizAction(input: QuizInput) {
  await requirePermission("quiz.manage");
  const data = quizSchema.parse(input);

  return db.quiz.create({
    data: {
      editionId: data.editionId,
      title: data.title,
      description: emptyToNull(data.description),
      durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      shuffleQuestions: data.shuffleQuestions,
      shuffleOptions: data.shuffleOptions,
      showScore: data.showScore,
      showCorrectAnswers: data.showCorrectAnswers,
    },
  });
}

export async function updateQuizAction(id: string, input: QuizInput) {
  await requirePermission("quiz.manage");
  const data = quizSchema.parse(input);

  const existing = await db.quiz.findUnique({ where: { id } });
  if (!existing) throw new Error("QCM introuvable");

  return db.quiz.update({
    where: { id },
    data: {
      editionId: data.editionId,
      title: data.title,
      description: emptyToNull(data.description),
      durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      shuffleQuestions: data.shuffleQuestions,
      shuffleOptions: data.shuffleOptions,
      showScore: data.showScore,
      showCorrectAnswers: data.showCorrectAnswers,
    },
  });
}

export async function deleteQuizAction(id: string) {
  await requirePermission("quiz.manage");
  const attempts = await db.quizAttempt.count({ where: { quizId: id } });
  if (attempts > 0) {
    throw new Error("Ce QCM a déjà des tentatives et ne peut pas être supprimé — archivez-le plutôt");
  }
  await db.quiz.delete({ where: { id } });
}

export async function publishQuizAction(id: string) {
  await requirePermission("quiz.manage");
  const questionCount = await db.quizQuestion.count({ where: { quizId: id } });
  if (questionCount === 0) {
    throw new Error("Ajoutez au moins une question avant de publier ce QCM");
  }
  return db.quiz.update({ where: { id }, data: { status: "PUBLISHED" } });
}

export async function archiveQuizAction(id: string) {
  await requirePermission("quiz.manage");
  return db.quiz.update({ where: { id }, data: { status: "ARCHIVED" } });
}

export async function unpublishQuizAction(id: string) {
  await requirePermission("quiz.manage");
  return db.quiz.update({ where: { id }, data: { status: "DRAFT" } });
}

// ─────────────────────────────────────────────────────────────
// Composition du QCM (banque de questions → QCM)
// ─────────────────────────────────────────────────────────────

export async function addQuestionToQuizAction(quizId: string, questionId: string) {
  await requirePermission("quiz.manage");
  const [quiz, question, lastPosition] = await Promise.all([
    db.quiz.findUnique({ where: { id: quizId } }),
    db.question.findFirst({ where: { id: questionId, isDeleted: false } }),
    db.quizQuestion.findFirst({ where: { quizId }, orderBy: { position: "desc" } }),
  ]);
  if (!quiz) throw new Error("QCM introuvable");
  if (!question) throw new Error("Question introuvable");

  return db.quizQuestion.create({
    data: {
      quizId,
      questionId,
      position: (lastPosition?.position ?? -1) + 1,
      points: question.points,
    },
  });
}

export async function removeQuestionFromQuizAction(quizQuestionId: string) {
  await requirePermission("quiz.manage");
  await db.quizQuestion.delete({ where: { id: quizQuestionId } });
}

export async function reorderQuizQuestionAction(
  quizQuestionId: string,
  direction: "up" | "down"
) {
  await requirePermission("quiz.manage");
  const current = await db.quizQuestion.findUnique({ where: { id: quizQuestionId } });
  if (!current) throw new Error("Question introuvable dans ce QCM");

  const neighbor = await db.quizQuestion.findFirst({
    where: {
      quizId: current.quizId,
      position: direction === "up" ? { lt: current.position } : { gt: current.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.quizQuestion.update({ where: { id: current.id }, data: { position: neighbor.position } }),
    db.quizQuestion.update({ where: { id: neighbor.id }, data: { position: current.position } }),
  ]);
}

export async function updateQuizQuestionPointsAction(quizQuestionId: string, points: number) {
  await requirePermission("quiz.manage");
  await db.quizQuestion.update({ where: { id: quizQuestionId }, data: { points } });
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}
