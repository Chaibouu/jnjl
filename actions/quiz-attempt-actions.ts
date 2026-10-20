"use server";

import { assertApplicationPaid, isPaymentPending } from "@/lib/ambassador-access";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { ForbiddenError } from "@/lib/forbidden-error";
import { requirePermission } from "@/actions/requirePermission";
import { describeGate, getQuizGate } from "@/lib/training-progress";
import { getEffectiveRankingQuizId } from "@/lib/ranking-quiz";
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
  await assertApplicationPaid(application);
  return application;
}

/** Correction instantanée d'une réponse : jamais les bonnes réponses non choisies, seulement le verdict de ce qui est coché. */
export type AnswerFeedback = {
  isCorrect: boolean;
  /** Pour chaque option cochée : vrai si elle fait partie des bonnes réponses. */
  optionResults: Record<string, boolean>;
};

function gradeSelection(
  options: { id: string; isCorrect: boolean }[],
  selectedOptionIds: string[]
): AnswerFeedback {
  const correctIds = new Set(options.filter(option => option.isCorrect).map(option => option.id));
  const selected = new Set(selectedOptionIds);
  const optionResults: Record<string, boolean> = {};
  for (const id of selected) optionResults[id] = correctIds.has(id);
  const isCorrect = selected.size === correctIds.size && [...selected].every(id => correctIds.has(id));
  return { isCorrect, optionResults };
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
  if (await isPaymentPending(application)) return null;

  const effectiveRankingId = await getEffectiveRankingQuizId(edition.id, application.regionId);

  const allQuizzes = await db.quiz.findMany({
    // Un QCM réservé à une région n'est proposé qu'aux candidats de cette région.
    where: {
      editionId: edition.id,
      status: "PUBLISHED",
      OR: [{ regionId: null }, { regionId: application.regionId }],
    },
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
  // Pour une région qui a son propre QCM de classement, le QCM de classement national est masqué.
  const quizzes = allQuizzes.filter(quiz => !quiz.countsForRanking || quiz.id === effectiveRankingId);

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

  if (quiz.regionId && quiz.regionId !== application.regionId) {
    throw new Error("Ce QCM est réservé aux candidats d'une autre région");
  }
  if (quiz.countsForRanking) {
    const effectiveId = await getEffectiveRankingQuizId(quiz.editionId, application.regionId);
    if (effectiveId && effectiveId !== quiz.id) {
      throw new Error("Un QCM de classement propre à votre région est disponible : ce QCM ne vous concerne pas");
    }
  }

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
      // Une question déjà répondue est verrouillée : son verdict est rejoué tel quel après un rechargement.
      feedback: ((): AnswerFeedback | null => {
        const selected = answersByQuestion.get(item.questionId)?.selectedOptionIds ?? [];
        return selected.length > 0 ? gradeSelection(item.question.options, selected) : null;
      })(),
    })),
  };
}

/**
 * Enregistre la réponse d'une question et renvoie aussitôt son verdict (vert / rouge dans le joueur).
 * Une réponse validée est définitive : sans cela on pourrait essayer chaque option jusqu'au vert.
 */
export async function saveQuizAnswerAction(
  attemptId: string,
  questionId: string,
  selectedOptionIds: string[]
): Promise<AnswerFeedback> {
  const user = await getCurrentUser();
  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      ambassadorApplication: { select: { userId: true } },
      quiz: { include: { questions: { include: { question: { include: { options: true } } } } } },
    },
  });
  if (!attempt || attempt.ambassadorApplication.userId !== user.id) {
    throw new ForbiddenError("Tentative introuvable");
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new Error("Cette tentative est déjà terminée");
  }

  const item = attempt.quiz.questions.find(entry => entry.questionId === questionId);
  if (!item) throw new Error("Question introuvable dans ce QCM");
  const options = item.question.options;

  const existing = await db.quizAnswer.findUnique({
    where: { attemptId_questionId: { attemptId, questionId } },
    select: { selectedOptionIds: true },
  });
  if (existing && existing.selectedOptionIds.length > 0) {
    return gradeSelection(options, existing.selectedOptionIds);
  }

  const validIds = new Set(options.map(option => option.id));
  const selection = [...new Set(selectedOptionIds)].filter(id => validIds.has(id));
  if (selection.length === 0) throw new Error("Choisissez au moins une réponse");
  if (item.question.type !== "MULTIPLE_CHOICE" && selection.length > 1) {
    throw new Error("Une seule réponse est attendue");
  }

  await db.quizAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    update: { selectedOptionIds: selection },
    create: { attemptId, questionId, selectedOptionIds: selection },
  });
  return gradeSelection(options, selection);
}

/** Corrige et clôture la tentative côté serveur — le score n'est jamais calculé côté client. */
export async function submitQuizAttemptAction(attemptId: string) {
  const user = await getCurrentUser();
  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: { include: { question: { include: { options: true } } } } } },
      ambassadorApplication: { select: { id: true, userId: true, stage: true, regionId: true } },
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
    const isEffectiveRankingQuiz =
      attempt.quiz.countsForRanking &&
      (await getEffectiveRankingQuizId(attempt.quiz.editionId, attempt.ambassadorApplication.regionId)) === attempt.quiz.id;
    if (isEffectiveRankingQuiz) {
      const stage = attempt.ambassadorApplication.stage;
      await transaction.ambassadorApplication.update({
        where: { id: attempt.ambassadorApplication.id },
        data: {
          quizScore: percentage,
          quizCompletedAt: new Date(),
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
