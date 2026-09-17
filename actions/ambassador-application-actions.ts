"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ApplicationStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { hasAnyPermission } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/forbidden-error";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import type { User } from "@/types/user";

const applicationInclude = {
  region: { select: { id: true, name: true, code: true } },
  edition: { select: { id: true, name: true, year: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      emailVerified: true,
      isTwoFactorEnabled: true,
      deactivatedAt: true,
    },
  },
} as const;

async function requireAnyPermission(codes: string[]): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  if (!hasAnyPermission(user, codes)) {
    throw new ForbiddenError(`Permission requise : ${codes.join(" ou ")}`);
  }
  return user;
}

export async function listAmbassadorApplicationsAction() {
  await requirePermission("applications.ambassador.manage");
  return db.ambassadorApplication.findMany({
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getAmbassadorApplicationAction(id: string) {
  await requireAnyPermission([
    "applications.ambassador.manage",
    "ambassadors.accounts.manage",
  ]);
  const application = await db.ambassadorApplication.findUnique({
    where: { id },
    include: applicationInclude,
  });
  if (!application) throw new Error("Candidature introuvable");

  const lastQuizAttempt = await db.quizAttempt.findFirst({
    where: { ambassadorApplicationId: id, status: "COMPLETED" },
    orderBy: { submittedAt: "desc" },
    select: {
      percentage: true,
      passed: true,
      submittedAt: true,
      quiz: { select: { title: true } },
    },
  });

  return { ...application, lastQuizAttempt };
}

export async function acceptAmbassadorApplicationAction(id: string) {
  const reviewer = await requirePermission("applications.ambassador.manage");
  const application = await db.ambassadorApplication.findUnique({
    where: { id },
  });
  if (!application) throw new Error("Candidature introuvable");
  if (application.status === ApplicationStatus.RETENU && application.userId) {
    throw new Error("Cette candidature est déjà acceptée");
  }
  if (application.status === ApplicationStatus.NON_RETENU) {
    throw new Error(
      "Une candidature rejetée ne peut pas être acceptée directement"
    );
  }

  const account = await db.$transaction(async transaction => {
    let user = await transaction.user.findUnique({
      where: { email: application.email },
    });

    if (user?.isDeleted) throw new Error("Le compte associé est supprimé");

    if (!user) {
      user = await transaction.user.create({
        data: {
          name: `${application.firstName} ${application.lastName}`,
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          password: await bcrypt.hash(
            crypto.randomBytes(32).toString("hex"),
            12
          ),
          role: UserRole.USER,
          isActive: true,
          profile: { create: { regionId: application.regionId } },
        },
      });
    }

    await transaction.ambassadorApplication.update({
      where: { id },
      data: {
        userId: user.id,
        status: ApplicationStatus.RETENU,
        stage: "PAIEMENT",
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });
    return user;
  });

  try {
    const resetToken = await generatePasswordResetToken(application.email);
    await sendPasswordResetEmail(application.email, resetToken);
  } catch (error) {
    // La création du compte reste acquise même si le service email est indisponible.
    console.error(
      "Impossible d'envoyer le lien de création du mot de passe:",
      error
    );
  }

  return { userId: account.id };
}

export async function rejectAmbassadorApplicationAction(
  id: string,
  reason: string
) {
  const reviewer = await requirePermission("applications.ambassador.manage");
  const application = await db.ambassadorApplication.findUnique({
    where: { id },
  });
  if (!application) throw new Error("Candidature introuvable");
  if (application.status === ApplicationStatus.RETENU) {
    throw new Error("Une candidature acceptée ne peut pas être rejetée");
  }

  await db.ambassadorApplication.update({
    where: { id },
    data: {
      status: ApplicationStatus.NON_RETENU,
      reviewedById: reviewer.id,
      reviewedAt: new Date(),
      rejectionReason: reason.trim() || "Candidature non retenue",
    },
  });
  return { id };
}
