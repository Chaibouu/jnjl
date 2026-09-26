"use server";

import { ApplicationStatus, PaymentStatus } from "@prisma/client";
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

  const now = new Date();
  await db.$transaction(async transaction => {
    const payment = await transaction.payment.create({
      data: {
        ambassadorApplicationId,
        amount: data.amount,
        method: "MANUAL",
        provider: "point_focal",
        reference: data.reference?.trim() || null,
        status: PaymentStatus.VALIDE,
        validatedById: actor.id,
        validatedAt: now,
      },
    });

    await transaction.document.create({
      data: {
        type: "PAYMENT_RECEIPT",
        // Reçu consultable/imprimable depuis l'admin — pas de génération PDF
        // à ce stade (voir phase Documents), juste une page dédiée horodatée.
        fileUrl: `/admin/paiements/${ambassadorApplicationId}/recu`,
        userId: application.userId,
        ambassadorApplicationId,
        paymentId: payment.id,
      },
    });

    await transaction.ambassadorApplication.update({
      where: { id: ambassadorApplicationId },
      data: { stage: "FORMATION" },
    });
  });

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
