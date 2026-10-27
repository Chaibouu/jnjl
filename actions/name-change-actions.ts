"use server";

import { revalidatePath } from "next/cache";
import { auditAdminAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { notify } from "@/lib/notify";
import type { User } from "@/types/user";

/**
 * Correction du nom d'un ambassadeur. Le nom de la candidature figure sur ses documents officiels : l'ambassadeur
 * ne peut pas le changer lui-même, il envoie une demande motivée qu'un administrateur approuve ou refuse.
 * Les actions renvoient `{ ok:false, error }` au lieu de lever, car la production masque les erreurs levées.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

async function currentUser(): Promise<User | null> {
  const result = await getUser();
  return (result?.user?.user as User | undefined) ?? null;
}

/** Candidature et éventuelle demande en attente de l'ambassadeur connecté. */
export async function getMyNameChangeStateAction() {
  const user = await currentUser();
  if (!user) return null;
  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nameChangeRequests: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, firstName: true, lastName: true, status: true, decisionComment: true, createdAt: true },
      },
    },
  });
  return application;
}

export async function requestNameChangeAction(input: {
  firstName: string;
  lastName: string;
  reason: string;
}): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Authentification requise" };

  const firstName = clean(input.firstName);
  const lastName = clean(input.lastName);
  const reason = input.reason.trim();
  if (!firstName || !lastName) return { ok: false, error: "Le prénom et le nom sont obligatoires" };
  if (firstName.length > 80 || lastName.length > 80) return { ok: false, error: "Prénom ou nom trop long" };
  if (reason.length < 10) return { ok: false, error: "Expliquez la correction demandée (10 caractères minimum)" };

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true, nameChangeRequests: { where: { status: "EN_ATTENTE" }, select: { id: true } } },
  });
  if (!application) return { ok: false, error: "Aucune candidature ambassadeur trouvée pour votre compte" };
  if (application.nameChangeRequests.length > 0) {
    return { ok: false, error: "Une demande est déjà en attente de décision" };
  }
  if (firstName === application.firstName && lastName === application.lastName) {
    return { ok: false, error: "C'est déjà votre nom actuel" };
  }

  await db.nameChangeRequest.create({
    data: {
      ambassadorApplicationId: application.id,
      userId: user.id,
      oldFirstName: application.firstName,
      oldLastName: application.lastName,
      firstName,
      lastName,
      reason,
    },
  });
  revalidatePath("/profile");
  return { ok: true };
}

async function requireAdmin() {
  const actor = await requirePermission("applications.ambassador.manage");
  return actor.role === "ADMIN" || actor.role === "SUPER_ADMIN" ? actor : null;
}

/** Demandes de correction de nom (admin) : en attente d'abord. */
export async function listNameChangeRequestsAction() {
  const actor = await requireAdmin();
  if (!actor) return null;
  return db.nameChangeRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      oldFirstName: true,
      oldLastName: true,
      firstName: true,
      lastName: true,
      reason: true,
      status: true,
      decisionComment: true,
      createdAt: true,
      decidedAt: true,
      ambassadorApplication: { select: { email: true, region: { select: { name: true } } } },
    },
  });
}

export async function decideNameChangeAction(
  requestId: string,
  decision: "APPROUVEE" | "REFUSEE",
  comment: string
): Promise<Result> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Réservé aux administrateurs" };
  if (decision === "REFUSEE" && comment.trim().length < 3) return { ok: false, error: "Indiquez le motif du refus" };

  const request = await db.nameChangeRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      userId: true,
      firstName: true,
      lastName: true,
      oldFirstName: true,
      oldLastName: true,
      ambassadorApplicationId: true,
    },
  });
  if (!request || request.status !== "EN_ATTENTE") return { ok: false, error: "Cette demande a déjà été traitée" };

  const fullName = `${request.firstName} ${request.lastName}`;
  await db.$transaction([
    db.nameChangeRequest.update({
      where: { id: requestId },
      data: { status: decision, decidedById: actor.id, decidedAt: new Date(), decisionComment: comment.trim() || null },
    }),
    ...(decision === "APPROUVEE"
      ? [
          db.ambassadorApplication.update({
            where: { id: request.ambassadorApplicationId },
            data: { firstName: request.firstName, lastName: request.lastName },
          }),
          db.user.update({
            where: { id: request.userId },
            data: { name: fullName, firstName: request.firstName, lastName: request.lastName },
          }),
        ]
      : []),
  ]);

  await notify({
    userId: request.userId,
    title: decision === "APPROUVEE" ? "Correction de nom acceptée" : "Correction de nom refusée",
    message:
      decision === "APPROUVEE"
        ? `Votre nom est maintenant « ${fullName} » sur votre profil et vos documents. Les documents déjà téléchargés sont à télécharger de nouveau.`
        : `Votre demande de correction de nom a été refusée. ${comment.trim()}`,
    link: "/profile",
  });
  await auditAdminAction({
    actorId: actor.id,
    action: decision === "APPROUVEE" ? "NAME_CHANGE_APPROVED" : "NAME_CHANGE_REJECTED",
    target: {
      userId: request.userId,
      label: fullName,
      before: `${request.oldFirstName} ${request.oldLastName}`,
      after: fullName,
      comment: comment.trim() || undefined,
    },
  });
  revalidatePath("/admin/ambassadeurs/corrections-noms");
  return { ok: true };
}
