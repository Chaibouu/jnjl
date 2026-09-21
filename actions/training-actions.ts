"use server";

import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { ForbiddenError } from "@/lib/forbidden-error";
import { getCourseProgress, getRequiredCoursesProgress } from "@/lib/training-progress";
import { sanitizeRichHtml, toDisplayHtml, toPlainText } from "@/lib/rich-content";
import {
  trainingCourseSchema,
  trainingModuleSchema,
  type TrainingCourseInput,
  type TrainingModuleInput,
} from "@/schemas/training";
import type { User } from "@/types/user";

async function getCurrentUser(): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  return user;
}

// ─────────────────────────────────────────────────────────────
// Administration — formations
// ─────────────────────────────────────────────────────────────

/** Formations de toutes les éditions, avec leurs modules et les QCM qui y sont rattachés. */
export async function listTrainingCoursesAction() {
  await requirePermission("training.manage");
  const courses = await db.trainingCourse.findMany({
    include: {
      edition: { select: { id: true, name: true, year: true } },
      modules: {
        orderBy: { order: "asc" },
        include: { _count: { select: { progress: true } } },
      },
      quizzes: { select: { id: true, title: true, status: true, countsForRanking: true } },
    },
    orderBy: [{ editionId: "asc" }, { order: "asc" }],
  });

  // Les anciens contenus (texte simple) sont convertis en HTML pour l'éditeur riche.
  return courses.map(course => ({
    ...course,
    modules: course.modules.map(module => ({ ...module, content: toDisplayHtml(module.content) || null })),
  }));
}

export async function createTrainingCourseAction(input: TrainingCourseInput) {
  await requirePermission("training.manage");
  const data = trainingCourseSchema.parse(input);

  const last = await db.trainingCourse.findFirst({
    where: { editionId: data.editionId },
    orderBy: { order: "desc" },
  });

  return db.trainingCourse.create({
    data: {
      editionId: data.editionId,
      title: data.title,
      description: data.description?.trim() || null,
      isRequired: data.isRequired,
      hasCertificate: data.hasCertificate,
      order: (last?.order ?? -1) + 1,
    },
  });
}

export async function updateTrainingCourseAction(id: string, input: TrainingCourseInput) {
  await requirePermission("training.manage");
  const data = trainingCourseSchema.parse(input);

  const existing = await db.trainingCourse.findUnique({ where: { id } });
  if (!existing) throw new Error("Formation introuvable");
  // Les modules, QCM et attestations restent rattachés à leur édition d'origine.
  if (existing.editionId !== data.editionId) {
    throw new Error("L'édition d'une formation ne peut pas être modifiée");
  }

  return db.trainingCourse.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description?.trim() || null,
      isRequired: data.isRequired,
      hasCertificate: data.hasCertificate,
    },
  });
}

export async function deleteTrainingCourseAction(id: string) {
  await requirePermission("training.manage");

  const [progress, certificates] = await Promise.all([
    db.trainingProgress.count({ where: { module: { courseId: id } } }),
    db.document.count({ where: { trainingCourseId: id } }),
  ]);
  if (progress > 0 || certificates > 0) {
    throw new Error(
      "Cette formation a déjà été suivie (progression ou attestations) : elle ne peut plus être supprimée"
    );
  }

  // Les modules sont supprimés avec la formation ; les QCM liés deviennent des QCM libres.
  await db.trainingCourse.delete({ where: { id } });
  return { id };
}

export async function reorderTrainingCourseAction(id: string, direction: "up" | "down") {
  await requirePermission("training.manage");
  const current = await db.trainingCourse.findUnique({ where: { id } });
  if (!current) throw new Error("Formation introuvable");

  const neighbor = await db.trainingCourse.findFirst({
    where: {
      editionId: current.editionId,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.trainingCourse.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    db.trainingCourse.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);
}

// ─────────────────────────────────────────────────────────────
// Administration — modules
// ─────────────────────────────────────────────────────────────

/** HTML de l'éditeur riche nettoyé ; null si le contenu est vide (aucun texte, image, tableau ou vidéo). */
function contentToStore(content?: string): string | null {
  const html = sanitizeRichHtml(content ?? "").trim();
  if (!html) return null;
  const hasMedia = /<(img|iframe|table|hr)\b/i.test(html);
  return toPlainText(html) === "" && !hasMedia ? null : html;
}

export async function createTrainingModuleAction(input: TrainingModuleInput) {
  await requirePermission("training.manage");
  const data = trainingModuleSchema.parse(input);

  const course = await db.trainingCourse.findUnique({ where: { id: data.courseId } });
  if (!course) throw new Error("Formation introuvable");

  const last = await db.trainingModule.findFirst({
    where: { courseId: course.id },
    orderBy: { order: "desc" },
  });

  return db.trainingModule.create({
    data: {
      editionId: course.editionId,
      courseId: course.id,
      title: data.title,
      content: contentToStore(data.content),
      videoUrl: data.videoUrl?.trim() || null,
      order: (last?.order ?? -1) + 1,
    },
  });
}

export async function updateTrainingModuleAction(id: string, input: TrainingModuleInput) {
  await requirePermission("training.manage");
  const data = trainingModuleSchema.parse(input);

  const existing = await db.trainingModule.findUnique({ where: { id } });
  if (!existing) throw new Error("Module introuvable");
  // Le module peut changer de formation, à condition de rester dans la même édition.
  const course = await db.trainingCourse.findUnique({ where: { id: data.courseId } });
  if (!course || course.editionId !== existing.editionId) {
    throw new Error("Formation invalide pour ce module");
  }

  return db.trainingModule.update({
    where: { id },
    data: {
      courseId: course.id,
      title: data.title,
      content: contentToStore(data.content),
      videoUrl: data.videoUrl?.trim() || null,
    },
  });
}

export async function deleteTrainingModuleAction(id: string) {
  await requirePermission("training.manage");
  await db.trainingModule.delete({ where: { id } });
  return { id };
}

export async function reorderTrainingModuleAction(id: string, direction: "up" | "down") {
  await requirePermission("training.manage");
  const current = await db.trainingModule.findUnique({ where: { id } });
  if (!current) throw new Error("Module introuvable");

  const neighbor = await db.trainingModule.findFirst({
    where: {
      courseId: current.courseId,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.trainingModule.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    db.trainingModule.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);
}

// ─────────────────────────────────────────────────────────────
// Espace ambassadeur
// ─────────────────────────────────────────────────────────────

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

/**
 * Formations de l'édition active avec l'avancement de l'ambassadeur connecté,
 * les QCM qui les suivent et l'attestation éventuellement délivrée.
 */
export async function getMyTrainingStatusAction() {
  const user = await getCurrentUser();
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return null;

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
  });
  if (!application) return null;

  const courses = await db.trainingCourse.findMany({
    where: { editionId: edition.id },
    orderBy: { order: "asc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          progress: {
            where: { ambassadorApplicationId: application.id },
            select: { startedAt: true, completedAt: true },
          },
        },
      },
      quizzes: {
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          attempts: {
            where: { ambassadorApplicationId: application.id, status: "COMPLETED", passed: true },
            select: { id: true },
            take: 1,
          },
        },
      },
      documents: {
        where: { type: "TRAINING_CERTIFICATE", ambassadorApplicationId: application.id },
        select: { fileUrl: true, generatedAt: true },
        take: 1,
      },
    },
  });

  const result = courses
    .filter(course => course.modules.length > 0)
    .map(course => {
      const items = course.modules.map(module => ({
        id: module.id,
        title: module.title,
        hasVideo: !!module.videoUrl,
        startedAt: module.progress[0]?.startedAt ?? null,
        completedAt: module.progress[0]?.completedAt ?? null,
      }));
      const completedCount = items.filter(item => item.completedAt).length;
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        isRequired: course.isRequired,
        hasCertificate: course.hasCertificate,
        items,
        completedCount,
        totalCount: items.length,
        completed: completedCount === items.length,
        quizzes: course.quizzes.map(quiz => ({
          id: quiz.id,
          title: quiz.title,
          passed: quiz.attempts.length > 0,
        })),
        certificate: course.documents[0] ?? null,
      };
    });

  return { stage: application.stage, courses: result };
}

/**
 * Ouvre un module dans le lecteur : retourne son contenu complet et enregistre son ouverture
 * (condition pour pouvoir le terminer). Réservé à l'ambassadeur de l'édition du module.
 */
export async function getMyModuleAction(moduleId: string) {
  await getCurrentUser();
  const module = await db.trainingModule.findUnique({
    where: { id: moduleId },
    include: { course: { select: { id: true, title: true } } },
  });
  if (!module) return null;

  const application = await getMyAmbassadorApplication(module.editionId);

  const existing = await db.trainingProgress.findUnique({
    where: {
      ambassadorApplicationId_moduleId: { ambassadorApplicationId: application.id, moduleId },
    },
  });
  const progress = existing
    ? existing.startedAt
      ? existing
      : await db.trainingProgress.update({ where: { id: existing.id }, data: { startedAt: new Date() } })
    : await db.trainingProgress.create({
        data: { ambassadorApplicationId: application.id, moduleId, startedAt: new Date() },
      });

  const siblings = await db.trainingModule.findMany({
    where: { courseId: module.courseId },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });
  const index = siblings.findIndex(item => item.id === module.id);

  return {
    module: {
      id: module.id,
      title: module.title,
      html: toDisplayHtml(module.content),
      videoUrl: module.videoUrl,
    },
    course: module.course,
    completedAt: progress.completedAt,
    position: index + 1,
    total: siblings.length,
    previous: index > 0 ? siblings[index - 1] : null,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}

export async function markTrainingModuleCompleteAction(moduleId: string) {
  await getCurrentUser();
  const module = await db.trainingModule.findUnique({ where: { id: moduleId } });
  if (!module) throw new Error("Module introuvable");

  const application = await getMyAmbassadorApplication(module.editionId);

  // Un module ne peut être terminé qu'après avoir été ouvert dans le lecteur.
  const progress = await db.trainingProgress.findUnique({
    where: {
      ambassadorApplicationId_moduleId: { ambassadorApplicationId: application.id, moduleId },
    },
  });
  if (!progress?.startedAt) {
    throw new Error("Ouvrez et lisez ce module avant de le marquer comme terminé");
  }

  if (!progress.completedAt) {
    await db.trainingProgress.update({
      where: { id: progress.id },
      data: { completedAt: new Date() },
    });
  }

  // Une fois toutes les formations OBLIGATOIRES terminées, l'ambassadeur passe à l'étape QCM.
  if (application.stage === "FORMATION") {
    const required = await getRequiredCoursesProgress(module.editionId, application.id);
    if (required.totalCount > 0 && required.completed) {
      await db.ambassadorApplication.update({
        where: { id: application.id },
        data: { stage: "QCM" },
      });
    }
  }

  const course = await getCourseProgress(module.courseId, application.id);
  return { moduleId, courseCompleted: course.completed };
}
