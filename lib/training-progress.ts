import { db } from "@/lib/db";

export type CourseProgress = {
  totalCount: number;
  completedCount: number;
  /** Vrai si tous les modules sont terminés (ou s'il n'y en a aucun à suivre). */
  completed: boolean;
};

/** Avancement d'un ambassadeur sur les modules d'une formation. */
export async function getCourseProgress(
  courseId: string,
  ambassadorApplicationId: string
): Promise<CourseProgress> {
  const [totalCount, completedCount] = await Promise.all([
    db.trainingModule.count({ where: { courseId } }),
    db.trainingProgress.count({
      where: {
        ambassadorApplicationId,
        completedAt: { not: null },
        module: { courseId },
      },
    }),
  ]);
  return { totalCount, completedCount, completed: completedCount >= totalCount };
}

/** Avancement cumulé sur toutes les formations obligatoires de l'édition. */
export async function getRequiredCoursesProgress(
  editionId: string,
  ambassadorApplicationId: string
): Promise<CourseProgress> {
  const [totalCount, completedCount] = await Promise.all([
    db.trainingModule.count({ where: { course: { editionId, isRequired: true } } }),
    db.trainingProgress.count({
      where: {
        ambassadorApplicationId,
        completedAt: { not: null },
        module: { course: { editionId, isRequired: true } },
      },
    }),
  ]);
  return { totalCount, completedCount, completed: completedCount >= totalCount };
}

export type QuizGate =
  | { unlocked: true }
  | {
      unlocked: false;
      /** « course » : la formation liée au QCM ; « required » : formations obligatoires de l'édition. */
      kind: "course" | "required";
      courseTitle: string | null;
      completedCount: number;
      totalCount: number;
    };

/**
 * Règle d'accès à un QCM :
 * - QCM lié à une formation → cette formation doit être terminée ;
 * - QCM de classement non lié → les formations obligatoires de l'édition doivent être terminées ;
 * - QCM libre (ni lié, ni de classement) → toujours accessible.
 */
export async function getQuizGate(
  quiz: { editionId: string; courseId: string | null; countsForRanking: boolean },
  ambassadorApplicationId: string
): Promise<QuizGate> {
  if (quiz.courseId) {
    const [course, progress] = await Promise.all([
      db.trainingCourse.findUnique({ where: { id: quiz.courseId }, select: { title: true } }),
      getCourseProgress(quiz.courseId, ambassadorApplicationId),
    ]);
    if (progress.completed) return { unlocked: true };
    return {
      unlocked: false,
      kind: "course",
      courseTitle: course?.title ?? null,
      completedCount: progress.completedCount,
      totalCount: progress.totalCount,
    };
  }

  if (quiz.countsForRanking) {
    const progress = await getRequiredCoursesProgress(quiz.editionId, ambassadorApplicationId);
    if (progress.completed) return { unlocked: true };
    return {
      unlocked: false,
      kind: "required",
      courseTitle: null,
      completedCount: progress.completedCount,
      totalCount: progress.totalCount,
    };
  }

  return { unlocked: true };
}

/** Message d'erreur explicite quand un QCM est verrouillé. */
export function describeGate(gate: Extract<QuizGate, { unlocked: false }>): string {
  return gate.kind === "course" && gate.courseTitle
    ? `Terminez d'abord la formation « ${gate.courseTitle} » pour passer ce QCM`
    : "Vous devez terminer votre formation avant de passer ce QCM";
}
