"use server";

import { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { hasAnyPermission } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/forbidden-error";
import {
  recordManualPaymentSchema,
  type RecordManualPaymentInput,
} from "@/schemas/payment";
import type { User } from "@/types/user";
import { notify } from "@/lib/notify";
import { hasNoRequiredTraining } from "@/lib/training-progress";
import { createValidatedPayment } from "@/lib/payment-settlement";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";

/**
 * §9 — Paiement Ambassadeur, circuit MANUAL uniquement pour le moment : le
 * candidat se rend chez le point focal régional, qui saisit le paiement dans
 * le système et lui remet un reçu. La saisie du point focal VAUT validation
 * (pas d'étape "en attente" côté plateforme — l'argent a déjà été physiquement
 * reçu au moment de la saisie).
 */

const applicationInclude = {
  region: { select: { id: true, name: true, code: true } },
  edition: { select: { id: true, name: true, year: true } },
  payment: {
    include: { validatedBy: { select: { id: true, name: true } } },
  },
  paymentAttempts: {
    orderBy: { createdAt: "desc" as const },
    take: 3,
    select: { id: true, status: true, duplicate: true, createdAt: true, expiresAt: true },
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

export async function listAmbassadorPaymentsAction() {
  const actor = await requirePermission("payments.manage");
  const regionId = getActorRegionScope(actor);
  return db.ambassadorApplication.findMany({
    where: { status: ApplicationStatus.RETENU, ...(regionId ? { regionId } : {}) },
    include: applicationInclude,
    orderBy: { reviewedAt: "desc" },
  });
}

export async function recordManualPaymentAction(
  ambassadorApplicationId: string,
  input: RecordManualPaymentInput
) {
  const actor = await requirePermission("payments.manage");
  const data = recordManualPaymentSchema.parse(input);

  const application = await db.ambassadorApplication.findUnique({
    where: { id: ambassadorApplicationId },
    include: { payment: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);
  if (application.status !== ApplicationStatus.RETENU) {
    throw new Error(
      "Le paiement ne peut être saisi qu'après acceptation de la candidature"
    );
  }
  if (application.payment) {
    throw new Error("Un paiement a déjà été enregistré pour ce candidat");
  }
  if (!application.manualPaymentAllowed) {
    throw new Error(
      "Le paiement manuel n'est pas autorisé pour ce candidat : il règle en ligne. Un administrateur peut l'autoriser à titre exceptionnel."
    );
  }

  // Sans formation obligatoire dans l'édition, l'ambassadeur passe directement au QCM.
  const skipTraining = await hasNoRequiredTraining(application.editionId);
  await db.$transaction(transaction =>
    createValidatedPayment(transaction, {
      applicationId: ambassadorApplicationId,
      userId: application.userId,
      skipTraining,
      amount: data.amount,
      method: "MANUAL",
      provider: "point_focal",
      reference: data.reference?.trim() || null,
      validatedById: actor.id,
    })
  );

  await notify({
    userId: application.userId,
    title: "Paiement validé",
    message: "Votre paiement a été enregistré. Vous pouvez commencer votre formation.",
    link: "/ambassadeur/formation",
  });

  return { id: ambassadorApplicationId };
}

/** Lecture tolérante (ne lève pas si aucun paiement n'existe encore) — pour affichage sur la fiche candidature. */
export async function getPaymentStatusAction(ambassadorApplicationId: string) {
  const actor = await requireAnyPermission(["payments.manage", "applications.ambassador.manage"]);

  const application = await db.ambassadorApplication.findUnique({
    where: { id: ambassadorApplicationId },
    select: {
      regionId: true,
      payment: { include: { validatedBy: { select: { name: true } } } },
    },
  });
  if (!application) return null;
  assertRegionAccess(actor, application.regionId);
  return application.payment;
}

export async function getAmbassadorPaymentReceiptAction(
  ambassadorApplicationId: string
) {
  const actor = await requireAnyPermission(["payments.manage", "applications.ambassador.manage"]);

  const application = await db.ambassadorApplication.findUnique({
    where: { id: ambassadorApplicationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      regionId: true,
      region: { select: { name: true, code: true } },
      edition: { select: { name: true, year: true } },
      payment: {
        include: { validatedBy: { select: { name: true, email: true } } },
      },
    },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);
  if (!application.payment) throw new Error("Aucun paiement enregistré pour ce candidat");

  return application;
}

/** Un administrateur autorise (ou retire) le paiement manuel pour un candidat précis, à titre exceptionnel. */
export async function setManualPaymentAllowedAction(ambassadorApplicationId: string, allowed: boolean) {
  await requirePermission("payments.validate");
  const application = await db.ambassadorApplication.findUnique({
    where: { id: ambassadorApplicationId },
    select: { payment: { select: { id: true } } },
  });
  if (!application) throw new Error("Candidature introuvable");
  if (application.payment) throw new Error("Ce candidat a déjà payé");
  await db.ambassadorApplication.update({
    where: { id: ambassadorApplicationId },
    data: { manualPaymentAllowed: allowed },
  });
  return { id: ambassadorApplicationId, allowed };
}
