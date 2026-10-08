"use server";

import bcrypt from "bcryptjs";
import { ApplicationStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { hasAnyPermission } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/forbidden-error";
import { describeMailError, sendApplicationAcceptedEmail } from "@/lib/mail";
import { generateTemporaryPassword } from "@/lib/temp-password";
import type { User } from "@/types/user";
import { notify } from "@/lib/notify";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";

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
  const actor = await requirePermission("applications.ambassador.manage");
  const regionId = getActorRegionScope(actor);
  return db.ambassadorApplication.findMany({
    where: regionId ? { regionId } : undefined,
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getAmbassadorApplicationAction(id: string) {
  const actor = await requireAnyPermission([
    "applications.ambassador.manage",
    "ambassadors.accounts.manage",
  ]);
  const application = await db.ambassadorApplication.findUnique({
    where: { id },
    include: applicationInclude,
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);

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
  assertRegionAccess(reviewer, application.regionId);
  if (application.status === ApplicationStatus.RETENU && application.userId) {
    throw new Error("Cette candidature est déjà acceptée");
  }
  if (application.status === ApplicationStatus.NON_RETENU) {
    throw new Error(
      "Une candidature rejetée ne peut pas être acceptée directement"
    );
  }

  // Mot de passe provisoire propre à ce compte (jamais identique d'un candidat à l'autre), envoyé par email.
  let temporaryPassword: string | null = null;
  let existingAccount = false;
  const account = await db.$transaction(async transaction => {
    let user = await transaction.user.findUnique({
      where: { email: application.email },
    });

    if (user?.isDeleted) throw new Error("Le compte associé est supprimé");

    if (!user) {
      const generated = generateTemporaryPassword();
      user = await transaction.user.create({
        data: {
          name: `${application.firstName} ${application.lastName}`,
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          password: await bcrypt.hash(generated, 12),
          role: UserRole.USER,
          isActive: true,
          emailVerified: new Date(),
          profile: { create: { regionId: application.regionId } },
        },
      });
      temporaryPassword = generated;
    } else if (user.role === UserRole.USER) {
      // Compte déjà existant (inscription préalable, essai…) : le candidat reçoit lui aussi un mot de passe
      // provisoire dans l'email d'acceptation, qui remplace l'ancien. Les comptes administrateur/staff
      // qui partageraient la même adresse ne sont jamais modifiés.
      const generated = generateTemporaryPassword();
      await transaction.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(generated, 12) },
      });
      temporaryPassword = generated;
      existingAccount = true;
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

  // La création du compte reste acquise même si le service email est indisponible : l'échec est
  // signalé à l'administrateur, qui peut renvoyer les accès depuis la liste des candidatures.
  let emailSent = true;
  try {
    await sendApplicationAcceptedEmail(application.email, application.firstName, { temporaryPassword, existingAccount });
  } catch (error) {
    emailSent = false;
    console.error("Impossible d'envoyer l'email d'acceptation:", error);
  }

  await notify({
    userId: account.id,
    title: "Candidature retenue",
    message: "Votre candidature ambassadeur est retenue. Prochaine étape : le paiement des frais d'inscription, depuis « Mon paiement ».",
  });

  return { userId: account.id, emailSent };
}

/**
 * Renvoie à un ambassadeur déjà accepté l'email contenant ses accès. Avec `resetPassword`, un nouveau mot
 * de passe provisoire est généré (l'ancien cesse de fonctionner) ; sinon l'email indique seulement de se
 * connecter avec le compte existant. Seuls les comptes « ambassadeur » (rôle USER) peuvent être réinitialisés,
 * jamais un compte administrateur ou staff qui partagerait la même adresse.
 */
export async function resendAmbassadorAccessEmailAction(
  id: string,
  resetPassword: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const reviewer = await requirePermission("applications.ambassador.manage");
  const application = await db.ambassadorApplication.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, status: true, regionId: true, userId: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(reviewer, application.regionId);
  if (application.status !== ApplicationStatus.RETENU || !application.userId) {
    throw new Error("Seules les candidatures acceptées peuvent recevoir leurs accès");
  }

  const user = await db.user.findUnique({
    where: { id: application.userId },
    select: { id: true, role: true, email: true, isDeleted: true },
  });
  if (!user || user.isDeleted) throw new Error("Le compte associé est introuvable");

  if (!resetPassword) {
    try {
      await sendApplicationAcceptedEmail(user.email ?? application.email, application.firstName, { temporaryPassword: null });
      return { ok: true };
    } catch (error) {
      console.error("Accès non renvoyés:", error);
      return { ok: false, error: describeMailError(error) };
    }
  }

  if (user.role !== UserRole.USER) {
    return { ok: false, error: "Ce compte n'est pas un compte ambassadeur : son mot de passe ne peut pas être réinitialisé ici" };
  }

  // L'email part d'abord : le mot de passe n'est remplacé qu'une fois l'envoi réussi, pour ne jamais
  // laisser quelqu'un avec un mot de passe qu'il n'a pas reçu.
  const generated = generateTemporaryPassword();
  try {
    await sendApplicationAcceptedEmail(user.email ?? application.email, application.firstName, { temporaryPassword: generated, existingAccount: true });
  } catch (error) {
    console.error("Accès non renvoyés:", error);
    return { ok: false, error: describeMailError(error) };
  }
  await db.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(generated, 12) } });
  return { ok: true };
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
  assertRegionAccess(reviewer, application.regionId);
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
  await notify({
    userId: application.userId,
    email: application.email,
    title: "Candidature ambassadeur non retenue",
    message: `Votre candidature ambassadeur n'a pas été retenue. Motif : ${reason.trim() || "non précisé"}.`,
    sendEmail: true,
  });
  return { id };
}
