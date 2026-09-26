"use server";

import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { ForbiddenError } from "@/lib/forbidden-error";
import { requirePermission } from "@/actions/requirePermission";
import { describeGate, getQuizGate } from "@/lib/training-progress";
import type { User } from "@/types/user";
import { getActorRegionScope } from "@/lib/region-scope";

async function getCurrentUser(): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  return user;
}

async function getMyAmbassadorApplication(editionId: string) {
  const user = await getCurrentUser();
  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId },
  });
  if (!application) {
    throw new Error("Aucune candidature ambassadeur trouvée pour votre compte sur cette édition");
  }
  return application;
}

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ─────────────────────────────────────────────────────────────
// Espace ambassadeur
// ─────────────────────────────────────────────────────────────

/**
 * Retourne tous les QCM publiés de l'édition active pour l'ambassadeur connecté, avec pour chacun :
 * l'état de ses tentatives et, si le QCM est verrouillé, la formation à terminer d'abord.
 */
export async function getMyQuizStatusAction() {
  const user = await getCurrentUser();
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return null;

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
  });
  if (!application) return null;

  const quizzes = await db.quiz.findMany({
    where: { editionId: edition.id, status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      passingScore: true,
      maxAttempts: true,
      courseId: true,
      countsForRanking: true,
      editionId: true,
      course: { select: { id: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  const items = await Promise.all(
    quizzes.map(async quiz => {
      const [gate, attempts] = await Promise.all([
        getQuizGate(quiz, application.id),
        db.quizAttempt.findMany({
          where: { quizId: quiz.id, ambassadorApplicationId: application.id },
          orderBy: { attemptNumber: "desc" },
        }),
      ]);

      const inProgress = attempts.find(attempt => attempt.status === "IN_PROGRESS");
      const attemptsUsed = attempts.filter(attempt => attempt.status !== "IN_PROGRESS").length;

      return {
        quiz,
        gate,
        attemptsUsed,
        attemptsRemaining: Math.max(0, quiz.maxAttempts - attemptsUsed),
        inProgressAttemptId: inProgress?.id ?? null,
        lastCompletedAttempt: attempts.find(attempt => attempt.status !== "IN_PROGRESS") ?? null,
        passed: attempts.some(attempt => attempt.passed === true),
      };
    })
  );

  return { quizzes: items };
}

/** Démarre (ou reprend) une tentative — ne renvoie jamais les bonnes réponses. */
export async function startQuizAttemptAction(quizId: string) {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { question: { include: { options: true } } } } },
  });
  if (!quiz || quiz.status !== "PUBLISHED") {
    throw new Error("Ce QCM n'est pas disponible");
  }

  const application = await getMyAmbassadorApplication(quiz.editionId);

  const gate = await getQuizGate(quiz, application.id);
  if (!gate.unlocked) {
    throw new Error(describeGate(gate));
  }

  const existing = await db.quizAttempt.findFirst({
    where: { quizId, ambassadorApplicationId: application.id, status: "IN_PROGRESS" },
  });
  if (existing) return getAttemptForPlayer(existing.id);

  const completedCount = await db.quizAttempt.count({
    where: {
      quizId,
      ambassadorApplicationId: application.id,
      status: { not: "IN_PROGRESS" },
    },
  });
  if (completedCount >= quiz.maxAttempts) {
    throw new Error("Vous avez épuisé le nombre de tentatives autorisées pour ce QCM");
  }

  const orderedQuestions = quiz.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions;

  const attempt = await db.quizAttempt.create({
    data: {
      quizId,
      ambassadorApplicationId: application.id,
      attemptNumber: completedCount + 1,
      questionOrder: orderedQuestions.map(item => item.id),
    },
  });

  return getAttemptForPlayer(attempt.id);
}

/** Renvoie l'état courant d'une tentative pour le joueur, sans jamais exposer isCorrect. */
export async function getAttemptForPlayer(attemptId: string) {
  const user = await getCurrentUser();
  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: { include: { question: { include: { options: true } } } } } },
      ambassadorApplication: { select: { userId: true } },
      answers: true,
    },
  });
  if (!attempt || attempt.ambassadorApplication.userId !== user.id) {
    throw new ForbiddenError("Tentative introuvable");
  }

  const byId = new Map(attempt.quiz.questions.map(item => [item.id, item]));
  const orderedItems = attempt.questionOrder
    .map(id => byId.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const answersByQuestion = new Map(attempt.answers.map(answer => [answer.questionId, answer]));

  const deadlineAt = attempt.quiz.durationMinutes
    ? new Date(attempt.startedAt.getTime() + attempt.quiz.durationMinutes * 60_000)
    : null;

  return {
    attemptId: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt,
    quiz: {
      id: attempt.quiz.id,
      title: attempt.quiz.title,
      description: attempt.quiz.description,
    },
    questions: orderedItems.map(item => ({
      quizQuestionId: item.id,
      questionId: item.questionId,
      type: item.question.type,
      text: item.question.text,
      points: item.points ?? item.question.points,
      options: (attempt.quiz.shuffleOptions
        ? shuffle(item.question.options)
        : [...item.question.options].sort((a, b) => a.position - b.position)
      ).map(option => ({ id: option.id, text: option.text })),
      selectedOptionIds: answersByQuestion.get(item.questionId)?.selectedOptionIds ?? [],
    })),
  };
}

/** Enregistre (ou met à jour) la réponse d'une question — appelé à chaque changement, pas de validation ici. */
export async function saveQuizAnswerAction(
  attemptId: string,
  questionId: string,
  selectedOptionIds: string[]
) {
  const user = await getCurrentUser();
  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { ambassadorApplication: { select: { userId: true } } },
  });
  if (!attempt || attempt.ambassadorApplication.userId !== user.id) {
    throw new ForbiddenError("Tentative introuvable");
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new Error("Cette tentative est déjà terminée");
  }

  await db.quizAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    update: { selectedOptionIds },
    create: { attemptId, questionId, selectedOptionIds },
  });
}

/** Corrige et clôture la tentative côté serveur — le score n'est jamais calculé côté client. */
export async function submitQuizAttemptAction(attemptId: string) {
  const user = await getCurrentUser();
  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: { include: { question: { include: { options: true } } } } } },
      ambassadorApplication: { select: { id: true, userId: true, stage: true } },
      answers: true,
    },
  });
  if (!attempt || attempt.ambassadorApplication.userId !== user.id) {
    throw new ForbiddenError("Tentative introuvable");
  }
  if (attempt.status !== "IN_PROGRESS") {
    return getAttemptResultAction(attemptId);
  }

  const answersByQuestion = new Map(attempt.answers.map(answer => [answer.questionId, answer]));

  let score = 0;
  let totalPoints = 0;
  const graded = attempt.quiz.questions.map(item => {
    const points = item.points ?? item.question.points;
    totalPoints += points;
    const correctOptionIds = new Set(
      item.question.options.filter(option => option.isCorrect).map(option => option.id)
    );
    const selected = new Set(answersByQuestion.get(item.questionId)?.selectedOptionIds ?? []);
    const isCorrect =
      selected.size === correctOptionIds.size &&
      [...selected].every(id => correctOptionIds.has(id));
    const earned = isCorrect ? points : 0;
    score += earned;
    return { questionId: item.questionId, isCorrect, points: earned };
  });

  const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
  const passed = percentage >= attempt.quiz.passingScore;

  await db.$transaction(async transaction => {
    for (const result of graded) {
      await transaction.quizAnswer.updateMany({
        where: { attemptId, questionId: result.questionId },
        data: { isCorrect: result.isCorrect, points: result.points },
      });
    }
    await transaction.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: "COMPLETED",
        submittedAt: new Date(),
        score,
        totalPoints,
        percentage,
        passed,
      },
    });
    // Seul le QCM de classement alimente le score régional et fait avancer le parcours.
    // Un QCM de formation ou un QCM libre n'a aucun effet sur le classement.
    if (attempt.quiz.countsForRanking) {
      const stage = attempt.ambassadorApplication.stage;
      await transaction.ambassadorApplication.update({
        where: { id: attempt.ambassadorApplication.id },
        data: {
          quizScore: percentage,
          // Ne jamais faire reculer un ambassadeur déjà plus avancé dans le parcours.
          ...(stage === "FORMATION" || stage === "QCM" ? { stage: "CLASSEMENT" } : {}),
        },
      });
    }
  });

  return getAttemptResultAction(attemptId);
}

export async function getAttemptResultAction(attemptId: string) {
  const user = await getCurrentUser();
  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: true,
      ambassadorApplication: { select: { userId: true } },
      answers: {
        include: { question: { include: { options: true } } },
      },
    },
  });
  if (!attempt || attempt.ambassadorApplication.userId !== user.id) {
    throw new ForbiddenError("Tentative introuvable");
  }

  return {
    attemptId: attempt.id,
    status: attempt.status,
    score: attempt.score,
    totalPoints: attempt.totalPoints,
    percentage: attempt.percentage,
    passed: attempt.passed,
    showScore: attempt.quiz.showScore,
    showCorrectAnswers: attempt.quiz.showCorrectAnswers,
    quizTitle: attempt.quiz.title,
    details: attempt.quiz.showCorrectAnswers
      ? attempt.answers.map(answer => ({
          questionId: answer.questionId,
          text: answer.question.text,
          explanation: answer.question.explanation,
          isCorrect: answer.isCorrect,
          selectedOptionIds: answer.selectedOptionIds,
          options: answer.question.options.map(option => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
        }))
      : [],
  };
}

// ─────────────────────────────────────────────────────────────
// Résultats admin
// ─────────────────────────────────────────────────────────────

export async function getQuizResultsAction(quizId: string) {
  const actor = await requirePermission("quiz.manage");
  const regionId = getActorRegionScope(actor);
  const attempts = await db.quizAttempt.findMany({
    where: {
      quizId,
      status: { not: "IN_PROGRESS" },
      ...(regionId ? { ambassadorApplication: { regionId } } : {}),
    },
    include: {
      ambassadorApplication: {
        select: {
          firstName: true,
          lastName: true,
          region: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: { percentage: "desc" },
  });

  const total = attempts.length;
  const passedCount = attempts.filter(attempt => attempt.passed).length;
  const average =
    total > 0 ? attempts.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) / total : 0;

  return {
    attempts,
    stats: {
      total,
      passedCount,
      passRate: total > 0 ? (passedCount / total) * 100 : 0,
      average,
    },
  };
}
