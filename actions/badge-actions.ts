"use server";

import { readFile } from "fs/promises";
import { join } from "path";
import QRCode from "qrcode";
import { generateBadgePdf } from "@/lib/generate-badge-pdf";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission } from "@/actions/requirePermission";
import { ForbiddenError } from "@/lib/forbidden-error";
import type { User } from "@/types/user";
import { notify } from "@/lib/notify";

const AMBASSADOR_BADGE = {
  code: "AMBASSADEUR" as const,
  label: "Ambassadeur JNJL",
  description: "Badge officiel de l'ambassadeur de la Journée Nationale du Jeune Leader",
};

async function getCurrentUser(): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  return user;
}

async function getAmbassadorBadge() {
  return db.badge.upsert({
    where: { code: AMBASSADOR_BADGE.code },
    update: {},
    create: AMBASSADOR_BADGE,
  });
}

async function nextBadgeNumber(editionYear: number, badgeId: string, editionId: string) {
  const count = await db.userBadge.count({ where: { badgeId, editionId } });
  return `JNJL-${editionYear}-AMB-${String(count + 1).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────
// Administration
// ─────────────────────────────────────────────────────────────

/** Ambassadeurs ayant signé leur engagement — éligibles à l'attribution du badge. */
export async function listBadgeCandidatesAction(editionId: string) {
  await requirePermission("badges.manage");

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      userId: { not: null },
      stage: { in: ["BADGE", "EMBARQUEMENT", "PRESENCE", "ATTESTATION"] },
      engagement: { isNot: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      stage: true,
      userId: true,
      region: { select: { name: true } },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });

  const userIds = applications.map(application => application.userId!).filter(Boolean);
  const badges = await db.userBadge.findMany({
    where: { editionId, userId: { in: userIds }, badge: { code: "AMBASSADEUR" } },
    select: { userId: true, number: true, awardedAt: true },
  });
  const badgeByUser = new Map(badges.map(badge => [badge.userId, badge]));

  return applications.map(application => ({
    id: application.id,
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    stage: application.stage,
    region: application.region,
    badge: badgeByUser.get(application.userId!) ?? null,
  }));
}

async function awardBadge(applicationId: string) {
  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: { edition: true, engagement: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  if (!application.userId) throw new Error("Cet ambassadeur n'a pas de compte utilisateur");
  if (!application.engagement) {
    throw new Error("La fiche d'engagement doit être signée avant l'attribution du badge");
  }

  const badge = await getAmbassadorBadge();
  const existing = await db.userBadge.findFirst({
    where: { userId: application.userId, badgeId: badge.id, editionId: application.editionId },
  });
  if (existing) return existing;

  const number = await nextBadgeNumber(application.edition.year, badge.id, application.editionId);

  const [userBadge] = await db.$transaction([
    db.userBadge.create({
      data: {
        userId: application.userId,
        badgeId: badge.id,
        editionId: application.editionId,
        number,
        qrCode: number,
      },
    }),
    db.ambassadorApplication.update({
      where: { id: application.id },
      data: { stage: application.stage === "BADGE" ? "EMBARQUEMENT" : application.stage },
    }),
  ]);

  await notify({
    userId: application.userId,
    title: "Votre badge est disponible",
    message: `Votre badge d'ambassadeur ${number} est prêt. Présentez-le lors de l'embarquement et à l'événement.`,
    link: "/ambassadeur/badge",
  });

  return userBadge;
}

export async function awardAmbassadorBadgeAction(applicationId: string) {
  await requirePermission("badges.manage");
  const userBadge = await awardBadge(applicationId);
  return { number: userBadge.number };
}

export async function awardAllAmbassadorBadgesAction(editionId: string) {
  await requirePermission("badges.manage");

  const pending = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      stage: "BADGE",
      userId: { not: null },
      engagement: { isNot: null },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  // Attribution séquentielle : la numérotation dépend du nombre de badges déjà émis.
  for (const application of pending) {
    await awardBadge(application.id);
  }

  return { count: pending.length };
}

// ─────────────────────────────────────────────────────────────
// Espace ambassadeur
// ─────────────────────────────────────────────────────────────

export async function getMyBadgeAction() {
  const user = await getCurrentUser();
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return null;

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
    include: {
      engagement: { select: { acceptedAt: true } },
      region: { select: { name: true } },
      boarding: { select: { status: true } },
    },
  });
  if (!application) return null;

  const userBadge = await db.userBadge.findFirst({
    where: { userId: user.id, editionId: edition.id, badge: { code: "AMBASSADEUR" } },
    include: { badge: true },
  });

  const qrDataUrl = userBadge?.qrCode
    ? await QRCode.toDataURL(userBadge.qrCode, { margin: 1, width: 240 })
    : null;

  return {
    stage: application.stage,
    hasSignedEngagement: !!application.engagement,
    boardingStatus: application.boarding?.status ?? "EN_ATTENTE",
    fullName: `${application.firstName} ${application.lastName}`,
    region: application.region.name,
    editionName: `${edition.name} (${edition.year})`,
    badge: userBadge
      ? {
          label: userBadge.badge.label,
          number: userBadge.number,
          awardedAt: userBadge.awardedAt,
          qrDataUrl,
        }
      : null,
  };
}

/** Logo de la JNJL : lu sur le disque, ou récupéré depuis le site si le fichier n'est pas accessible. */
async function loadLogo(): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await readFile(join(process.cwd(), "public", "jnjl.jpg")));
  } catch {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/jnjl.jpg`);
      if (response.ok) return new Uint8Array(await response.arrayBuffer());
    } catch {
      // Sans logo, le badge est quand même généré.
    }
  }
  return null;
}

/**
 * Génère le badge de l'ambassadeur connecté en PDF (format A6, imprimable) et le renvoie
 * encodé en base64 pour un téléchargement immédiat. Réservé au propriétaire du badge.
 */
export async function downloadMyBadgeAction() {
  const data = await getMyBadgeAction();
  if (!data?.badge?.number) {
    throw new Error("Votre badge n'a pas encore été attribué");
  }

  const pdf = await generateBadgePdf({
    label: data.badge.label,
    fullName: data.fullName,
    region: data.region,
    editionName: data.editionName,
    number: data.badge.number,
    awardedAt: data.badge.awardedAt,
    logo: await loadLogo(),
  });

  return {
    filename: `badge-${data.badge.number}.pdf`,
    base64: Buffer.from(pdf).toString("base64"),
  };
}
