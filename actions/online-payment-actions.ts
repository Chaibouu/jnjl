"use server";

import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { ForbiddenError } from "@/lib/forbidden-error";
import {
  AMBASSADOR_FEE,
  PAYMENT_LINK_TTL_MS,
  createPaymentLink,
  newPaymentReference,
} from "@/lib/ipay";
import { confirmPaymentAttempt, reconcilePendingPayments } from "@/lib/online-payment";
import { assertRegionAccess } from "@/lib/region-scope";
import type { User } from "@/types/user";

async function getMyApplication() {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return null;
  return db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
    include: { edition: { select: { name: true, year: true } } },
  });
}

/** État du paiement de l'ambassadeur connecté (revérifie d'abord les tentatives en cours). */
export async function getMyPaymentStateAction() {
  const application = await getMyApplication();
  if (!application) return null;
  await reconcilePendingPayments(application.id);

  const fresh = await db.ambassadorApplication.findUnique({
    where: { id: application.id },
    select: {
      status: true,
      manualPaymentAllowed: true,
      payment: { select: { amount: true, method: true, validatedAt: true, reference: true } },
      paymentAttempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, expiresAt: true, pageUrl: true },
      },
    },
  });
  if (!fresh) return null;
  const last = fresh.paymentAttempts[0] ?? null;
  return {
    accepted: fresh.status === "RETENU",
    amount: AMBASSADOR_FEE,
    paid: fresh.payment,
    pending:
      last && last.status === "INITIATED" && last.expiresAt.getTime() > Date.now()
        ? { pageUrl: last.pageUrl, expiresAt: last.expiresAt }
        : null,
    manualAllowed: fresh.manualPaymentAllowed,
  };
}

/** Crée (ou reprend) le lien de paiement en ligne de l'ambassadeur connecté. */
export async function startOnlinePaymentAction() {
  const application = await getMyApplication();
  if (!application) throw new Error("Aucune candidature ambassadeur trouvée pour votre compte");
  if (application.status !== "RETENU") {
    throw new Error("Votre candidature doit d'abord être acceptée avant de payer");
  }

  // Revérifie d'abord : un paiement déjà réussi (page fermée plus tôt) ne doit pas être doublé.
  await reconcilePendingPayments(application.id);
  const paid = await db.payment.findUnique({ where: { ambassadorApplicationId: application.id } });
  if (paid) throw new Error("Votre paiement est déjà enregistré");

  const open = await db.paymentAttempt.findFirst({
    where: { ambassadorApplicationId: application.id, status: "INITIATED", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (open?.pageUrl) return { pageUrl: open.pageUrl };

  const reference = newPaymentReference();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const { pageUrl } = await createPaymentLink({
    reference,
    amount: AMBASSADOR_FEE,
    title: `Frais d'inscription ambassadeur JNJL ${application.edition.year}`,
    description: `${application.firstName} ${application.lastName}`,
    successUrl: `${appUrl}/ambassadeur/paiement?retour=1`,
    failedUrl: `${appUrl}/ambassadeur/paiement?retour=echec`,
  });

  await db.paymentAttempt.create({
    data: {
      ambassadorApplicationId: application.id,
      reference,
      amount: AMBASSADOR_FEE,
      pageUrl,
      expiresAt: new Date(Date.now() + PAYMENT_LINK_TTL_MS),
    },
  });
  return { pageUrl };
}

/** Bouton « J'ai payé mais mon statut n'est pas à jour » : revérification immédiate chez i-pay. */
export async function refreshMyPaymentAction() {
  const application = await getMyApplication();
  if (!application) throw new Error("Aucune candidature ambassadeur trouvée pour votre compte");
  await reconcilePendingPayments(application.id);
  const paid = await db.payment.findUnique({ where: { ambassadorApplicationId: application.id } });
  return { paid: !!paid };
}

// ─── Administration ──────────────────────────────────────────────────────────

/** Tentatives de paiement en ligne à surveiller (en attente, échouées, doublons, écarts de montant). */
export async function listPaymentAttemptsAction() {
  const actor = await requirePermission("payments.manage");
  const regionId = actor.focalRegionId ?? null;
  return db.paymentAttempt.findMany({
    where: {
      OR: [{ status: { in: ["INITIATED", "MISMATCH", "FAILED"] } }, { duplicate: true }],
      ...(regionId ? { ambassadorApplication: { regionId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      duplicate: true,
      note: true,
      createdAt: true,
      expiresAt: true,
      ambassadorApplication: {
        select: { firstName: true, lastName: true, phone: true, region: { select: { name: true } } },
      },
    },
  });
}

/** Revérifie une tentative chez i-pay (résout automatiquement si le paiement a bien abouti). */
export async function recheckPaymentAttemptAction(attemptId: string) {
  const actor = await requirePermission("payments.manage");
  const attempt = await db.paymentAttempt.findUnique({
    where: { id: attemptId },
    select: { reference: true, ambassadorApplication: { select: { regionId: true } } },
  });
  if (!attempt) throw new Error("Tentative introuvable");
  assertRegionAccess(actor, attempt.ambassadorApplication.regionId);
  return { outcome: await confirmPaymentAttempt(attempt.reference) };
}
