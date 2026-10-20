"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { quizSchema, type QuizInput } from "@/schemas/quiz";
import { describeRankingConflict } from "@/lib/ranking-quiz";

export async function listQuizzesAction() {
  await requirePermission("quiz.manage");
  return db.quiz.findMany({
    include: {
      edition: { select: { id: true, name: true, year: true } },
      course: { select: { id: true, title: true } },
      region: { select: { id: true, name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Régions proposées dans le formulaire QCM pour réserver un QCM à une région. */
export async function listRegionOptionsAction() {
  await requirePermission("quiz.manage");
  return db.region.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

/** Une région choisie doit exister ; vide = QCM national. */
async function resolveRegionId(regionId?: string) {
  if (!regionId) return null;
  const region = await db.region.findUnique({ where: { id: regionId }, select: { id: true } });
  if (!region) throw new Error("Région introuvable");
  return region.id;
}

/** Formations proposées dans le formulaire QCM pour lier un QCM à une formation. */
export async function listCourseOptionsAction() {
  await requirePermission("quiz.manage");
  return db.trainingCourse.findMany({
    select: { id: true, title: true, editionId: true },
    orderBy: [{ editionId: "asc" }, { order: "asc" }],
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

/** Une formation liée doit exister et appartenir à la même édition que le QCM. */
async function resolveCourseId(editionId: string, courseId?: string) {
  if (!courseId) return null;
  const course = await db.trainingCourse.findUnique({ where: { id: courseId } });
  if (!course || course.editionId !== editionId) {
    throw new Error("La formation choisie n'appartient pas à l'édition de ce QCM");
  }
  return course.id;
}

export async function createQuizAction(input: QuizInput) {
  await requirePermission("quiz.manage");
  const data = quizSchema.parse(input);

  return db.quiz.create({
    data: {
      editionId: data.editionId,
      courseId: await resolveCourseId(data.editionId, data.courseId),
      countsForRanking: data.countsForRanking,
      regionId: await resolveRegionId(data.regionId),
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

  const regionId = await resolveRegionId(data.regionId);
  if (existing.status === "PUBLISHED" && data.countsForRanking) {
    const conflict = await describeRankingConflict({ editionId: data.editionId, regionId, excludeId: id });
    if (conflict) throw new Error(conflict);
  }

  const updated = await db.quiz.update({
    where: { id },
    data: {
      editionId: data.editionId,
      courseId: await resolveCourseId(data.editionId, data.courseId),
      countsForRanking: data.countsForRanking,
      regionId,
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

  // QCM passé avant d'être déclaré « de classement » : on rattrape les tentatives déjà terminées,
  // sinon ces ambassadeurs resteraient bloqués à l'étape QCM.
  if (!existing.countsForRanking && data.countsForRanking) {
    const attempts = await db.quizAttempt.findMany({
      where: { quizId: id, status: "COMPLETED", ambassadorApplication: { stage: { in: ["FORMATION", "QCM"] } } },
      orderBy: { submittedAt: "desc" },
      select: { ambassadorApplicationId: true, percentage: true, submittedAt: true },
    });
    const latest = new Map<string, { percentage: number; submittedAt: Date | null }>();
    for (const attempt of attempts) {
      if (!latest.has(attempt.ambassadorApplicationId)) {
        latest.set(attempt.ambassadorApplicationId, {
          percentage: attempt.percentage ?? 0,
          submittedAt: attempt.submittedAt,
        });
      }
    }
    for (const [applicationId, result] of latest) {
      await db.ambassadorApplication.update({
        where: { id: applicationId },
        data: { quizScore: result.percentage, quizCompletedAt: result.submittedAt, stage: "CLASSEMENT" },
      });
    }
  }

  return updated;
}

export async function deleteQuizAction(id: string) {
  await requirePermission("quiz.manage");
  const attempts = await db.quizAttempt.count({ where: { quizId: id } });
  if (attempts > 0) {
    throw new Error("Ce QCM a déjà des tentatives et ne peut pas être supprimé — archivez-le plutôt");
  }
  await db.quiz.delete({ where: { id } });
}

export async function publishQuizAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("quiz.manage");
  const quiz = await db.quiz.findUnique({
    where: { id },
    select: { editionId: true, regionId: true, countsForRanking: true },
  });
  if (!quiz) return { ok: false, error: "QCM introuvable" };

  const questionCount = await db.quizQuestion.count({ where: { quizId: id } });
  if (questionCount === 0) {
    return { ok: false, error: "Ajoutez au moins une question avant de publier ce QCM" };
  }
  if (quiz.countsForRanking) {
    const conflict = await describeRankingConflict({ editionId: quiz.editionId, regionId: quiz.regionId, excludeId: id });
    if (conflict) return { ok: false, error: conflict };
  }
  await db.quiz.update({ where: { id }, data: { status: "PUBLISHED" } });
  return { ok: true };
}

export async function archiveQuizAction(id: string) {
  await requirePermission("quiz.manage");
  return db.quiz.update({ where: { id }, data: { status: "ARCHIVED" } });
}

/** Rend un QCM archivé à l'état de brouillon (il ne redevient visible des candidats qu'une fois republié). */
export async function unarchiveQuizAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("quiz.manage");
  const quiz = await db.quiz.findUnique({ where: { id }, select: { status: true } });
  if (!quiz) return { ok: false, error: "QCM introuvable" };
  if (quiz.status !== "ARCHIVED") return { ok: false, error: "Ce QCM n'est pas archivé" };
  await db.quiz.update({ where: { id }, data: { status: "DRAFT" } });
  return { ok: true };
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
