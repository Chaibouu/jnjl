"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { ForbiddenError } from "@/lib/forbidden-error";
import { saveFile } from "@/lib/storage";
import { storagePaths } from "@/lib/storage-paths";
import { generateTrainingCertificatePdf } from "@/lib/generate-certificate-pdf";
import { generateAttestationPdf } from "@/lib/generate-attestation-pdf";
import type { User } from "@/types/user";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";

// ─────────────────────────────────────────────────────────────
// Administration
// ─────────────────────────────────────────────────────────────

/** Ambassadeurs ayant été pointés présents (étape ATTESTATION) et leur attestation éventuelle. */
export async function listCertificateCandidatesAction(editionId: string) {
  const actor = await requirePermission("documents.manage");
  const regionId = getActorRegionScope(actor);

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      stage: "ATTESTATION",
      userId: { not: null },
      ...(regionId ? { regionId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      region: { select: { name: true } },
      documents: {
        where: { type: "CERTIFICATE" },
        select: { fileUrl: true, generatedAt: true },
        take: 1,
      },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });

  return applications.map(application => ({
    id: application.id,
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    region: application.region,
    certificate: application.documents[0] ?? null,
  }));
}

const ATTESTATION_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

/** "21 novembre 2026" (un jour) ou "28 septembre 2026 et 30 septembre 2026" (plusieurs jours). */
function formatAttestationEventDate(startDate: Date | null, endDate: Date | null): string {
  if (!startDate) return "";
  const format = (date: Date) => date.toLocaleDateString("fr-FR", ATTESTATION_DATE_FORMAT);
  if (!endDate || startDate.getTime() === endDate.getTime()) return format(startDate);
  return `${format(startDate)} et ${format(endDate)}`;
}

async function issueCertificate(actor: User, applicationId: string) {
  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: {
      edition: {
        select: {
          name: true,
          year: true,
          theme: true,
          location: true,
          startDate: true,
          endDate: true,
          attestationTheme: true,
          attestationLocation: true,
          attestationStartDate: true,
          attestationEndDate: true,
          attestationEditionLabel: true,
        },
      },
      region: { select: { name: true } },
      documents: { where: { type: "CERTIFICATE" }, take: 1 },
    },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);
  if (!application.userId) throw new Error("Cet ambassadeur n'a pas de compte utilisateur");
  if (application.stage !== "ATTESTATION") {
    throw new Error("L'attestation n'est délivrée qu'après le pointage de présence");
  }
  if (application.documents[0]) return application.documents[0];

  const attendance = await db.attendance.count({
    where: { editionId: application.editionId, userId: application.userId },
  });
  if (attendance === 0) throw new Error("Aucune présence enregistrée pour cet ambassadeur");

  const edition = application.edition;
  const issuedAt = new Date();
  const pdfBytes = await generateAttestationPdf({
    ambassadorName: `${application.firstName} ${application.lastName}`,
    theme: edition.attestationTheme?.trim() || edition.theme || edition.name,
    location: edition.attestationLocation?.trim() || edition.location || "Niamey",
    eventDate:
      formatAttestationEventDate(edition.attestationStartDate ?? edition.startDate, edition.attestationEndDate ?? edition.endDate) ||
      issuedAt.toLocaleDateString("fr-FR", ATTESTATION_DATE_FORMAT),
    editionName: edition.attestationEditionLabel?.trim() || edition.name,
  });

  const fileUrl = await saveFile({
    folder: storagePaths.certificate(application.edition.year),
    filename: `${randomUUID()}.pdf`,
    body: pdfBytes,
    contentType: "application/pdf",
  });

  const [document] = await db.$transaction([
    db.document.create({
      data: {
        type: "CERTIFICATE",
        fileUrl,
        userId: application.userId,
        ambassadorApplicationId: application.id,
        generatedAt: issuedAt,
      },
    }),
    db.notification.create({
      data: {
        userId: application.userId,
        title: "Votre attestation est disponible",
        message: "Votre attestation de participation JNJL est prête à être téléchargée.",
        link: "/ambassadeur/attestation",
      },
    }),
  ]);

  return document;
}

export async function issueCertificateAction(applicationId: string) {
  const actor = await requirePermission("documents.manage");
  const document = await issueCertificate(actor, applicationId);
  return { fileUrl: document.fileUrl };
}

export async function issueAllCertificatesAction(editionId: string) {
  const actor = await requirePermission("documents.manage");
  const regionId = getActorRegionScope(actor);

  const pending = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      stage: "ATTESTATION",
      userId: { not: null },
      documents: { none: { type: "CERTIFICATE" } },
      ...(regionId ? { regionId } : {}),
    },
    select: { id: true },
  });

  let count = 0;
  for (const application of pending) {
    try {
      await issueCertificate(actor, application.id);
      count += 1;
    } catch {
      // Ambassadeur sans présence enregistrée : ignoré, il reste dans la liste.
    }
  }
  return { count, skipped: pending.length - count };
}

// ─────────────────────────────────────────────────────────────
// Attestations de formation (délivrées par l'admin)
// ─────────────────────────────────────────────────────────────

/** Formations qui délivrent une attestation. */
export async function listCertifiableCoursesAction() {
  await requirePermission("documents.manage");
  return db.trainingCourse.findMany({
    where: { hasCertificate: true },
    select: { id: true, title: true, edition: { select: { name: true, year: true } } },
    orderBy: [{ editionId: "asc" }, { order: "asc" }],
  });
}

/**
 * Ambassadeurs ayant commencé la formation, avec leur progression et leur éligibilité :
 * tous les modules terminés ET tous les QCM publiés liés à la formation réussis.
 */
export async function listTrainingCertificateCandidatesAction(courseId: string) {
  const actor = await requirePermission("documents.manage");
  const regionId = getActorRegionScope(actor);

  const course = await db.trainingCourse.findUnique({
    where: { id: courseId },
    include: {
      modules: { select: { id: true } },
      quizzes: { where: { status: "PUBLISHED" }, select: { id: true } },
    },
  });
  if (!course) throw new Error("Formation introuvable");

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId: course.editionId,
      status: "RETENU",
      userId: { not: null },
      trainingProgress: { some: { module: { courseId }, completedAt: { not: null } } },
      ...(regionId ? { regionId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      region: { select: { name: true } },
      trainingProgress: {
        where: { module: { courseId }, completedAt: { not: null } },
        select: { moduleId: true },
      },
      quizAttempts: {
        where: { quiz: { courseId, status: "PUBLISHED" }, status: "COMPLETED", passed: true },
        select: { quizId: true },
      },
      documents: {
        where: { type: "TRAINING_CERTIFICATE", trainingCourseId: courseId },
        select: { fileUrl: true, generatedAt: true },
        take: 1,
      },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });

  return {
    modulesTotal: course.modules.length,
    quizzesTotal: course.quizzes.length,
    candidates: applications.map(application => {
      const modulesDone = new Set(application.trainingProgress.map(item => item.moduleId)).size;
      const quizzesPassed = new Set(application.quizAttempts.map(item => item.quizId)).size;
      return {
        id: application.id,
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        region: application.region,
        modulesDone,
        quizzesPassed,
        eligible:
          course.modules.length > 0 &&
          modulesDone >= course.modules.length &&
          quizzesPassed >= course.quizzes.length,
        certificate: application.documents[0] ?? null,
      };
    }),
  };
}

async function issueTrainingCertificate(actor: User, courseId: string, applicationId: string) {
  const [course, application] = await Promise.all([
    db.trainingCourse.findUnique({
      where: { id: courseId },
      include: {
        edition: { select: { name: true, year: true } },
        modules: { select: { id: true } },
        quizzes: { where: { status: "PUBLISHED" }, select: { id: true } },
      },
    }),
    db.ambassadorApplication.findUnique({
      where: { id: applicationId },
      include: { region: { select: { name: true } } },
    }),
  ]);
  if (!course) throw new Error("Formation introuvable");
  if (!course.hasCertificate) throw new Error("Cette formation ne délivre pas d'attestation");
  if (!application || application.editionId !== course.editionId) {
    throw new Error("Candidature introuvable pour cette formation");
  }
  assertRegionAccess(actor, application.regionId);
  if (!application.userId) throw new Error("Cet ambassadeur n'a pas de compte utilisateur");

  const existing = await db.document.findFirst({
    where: { type: "TRAINING_CERTIFICATE", trainingCourseId: courseId, ambassadorApplicationId: applicationId },
  });
  if (existing) return existing;

  // Éligibilité revérifiée côté serveur, indépendamment de l'affichage.
  const modulesDone = await db.trainingProgress.count({
    where: {
      ambassadorApplicationId: applicationId,
      completedAt: { not: null },
      moduleId: { in: course.modules.map(module => module.id) },
    },
  });
  if (course.modules.length === 0 || modulesDone < course.modules.length) {
    throw new Error("La formation n'est pas terminée");
  }

  const passedAttempts = await db.quizAttempt.findMany({
    where: {
      ambassadorApplicationId: applicationId,
      quizId: { in: course.quizzes.map(quiz => quiz.id) },
      status: "COMPLETED",
      passed: true,
    },
    select: { quizId: true, percentage: true },
  });
  const passedQuizIds = new Set(passedAttempts.map(attempt => attempt.quizId));
  if (course.quizzes.some(quiz => !passedQuizIds.has(quiz.id))) {
    throw new Error("Le QCM de cette formation n'a pas été réussi");
  }

  const issuedAt = new Date();
  const scorePercent =
    passedAttempts.length > 0
      ? Math.max(...passedAttempts.map(attempt => attempt.percentage ?? 0))
      : null;

  const pdfBytes = await generateTrainingCertificatePdf({
    editionId: course.editionId,
    ambassadorName: `${application.firstName} ${application.lastName}`,
    region: application.region.name,
    editionName: `${course.edition.name} (${course.edition.year})`,
    courseTitle: course.title,
    scorePercent,
    reference: `FORM-${course.edition.year}-${randomUUID().slice(0, 8).toUpperCase()}`,
    issuedAt,
  });

  const fileUrl = await saveFile({
    folder: storagePaths.trainingCertificate(course.edition.year),
    filename: `${randomUUID()}.pdf`,
    body: pdfBytes,
    contentType: "application/pdf",
  });

  const [document] = await db.$transaction([
    db.document.create({
      data: {
        type: "TRAINING_CERTIFICATE",
        fileUrl,
        userId: application.userId,
        ambassadorApplicationId: application.id,
        trainingCourseId: course.id,
        generatedAt: issuedAt,
      },
    }),
    db.notification.create({
      data: {
        userId: application.userId,
        title: "Votre attestation de formation est disponible",
        message: `Votre attestation pour la formation « ${course.title} » est prête à être téléchargée.`,
        link: "/ambassadeur/attestation",
      },
    }),
  ]);

  return document;
}

export async function issueTrainingCertificateAction(courseId: string, applicationId: string) {
  const actor = await requirePermission("documents.manage");
  const document = await issueTrainingCertificate(actor, courseId, applicationId);
  return { fileUrl: document.fileUrl };
}

export async function issueAllTrainingCertificatesAction(courseId: string) {
  const actor = await requirePermission("documents.manage");

  const { candidates } = await listTrainingCertificateCandidatesAction(courseId);
  const pending = candidates.filter(candidate => candidate.eligible && !candidate.certificate);

  let count = 0;
  for (const candidate of pending) {
    try {
      await issueTrainingCertificate(actor, courseId, candidate.id);
      count += 1;
    } catch {
      // Cas limite (ex. compte supprimé) : ignoré, l'ambassadeur reste dans la liste.
    }
  }
  return { count, skipped: pending.length - count };
}

// ─────────────────────────────────────────────────────────────
// Espace ambassadeur
// ─────────────────────────────────────────────────────────────

export async function getMyCertificateAction() {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");

  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return null;

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
    select: {
      stage: true,
      documents: {
        where: { type: { in: ["CERTIFICATE", "TRAINING_CERTIFICATE"] } },
        select: {
          type: true,
          fileUrl: true,
          generatedAt: true,
          trainingCourse: { select: { title: true } },
        },
        orderBy: { generatedAt: "asc" },
      },
    },
  });
  if (!application) return null;

  return {
    stage: application.stage,
    editionName: `${edition.name} (${edition.year})`,
    certificate: application.documents.find(document => document.type === "CERTIFICATE") ?? null,
    trainingCertificates: application.documents
      .filter(document => document.type === "TRAINING_CERTIFICATE")
      .map(document => ({
        courseTitle: document.trainingCourse?.title ?? "Formation",
        fileUrl: document.fileUrl,
        generatedAt: document.generatedAt,
      })),
  };
}
