"use server";

import { auditAdminAction } from "@/lib/audit";
import QRCode from "qrcode";
import { generateBadgePdf } from "@/lib/generate-badge-pdf";
import { loadPublicImage, PARTNER_LOGO_PATHS } from "@/lib/badge-assets";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { requirePermission, requireSuperAdmin } from "@/actions/requirePermission";
import { ForbiddenError } from "@/lib/forbidden-error";
import type { User } from "@/types/user";
import { notify } from "@/lib/notify";
import { syncBadgeQr, syncBadgeQrDetailed } from "@/lib/badge-qr";
import { setBadgeQrActive } from "@/lib/scanhub";
import { renderBadgePart } from "@/lib/badge-batch";
import type { DesignBadgeItem } from "@/lib/generate-badge-pdf";
import { assertRegionAccess, getActorRegionScope } from "@/lib/region-scope";

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

/** Réglage : plus haut numéro d'ambassadeur déjà attribué dans l'édition, même si le badge a été annulé depuis. */
const burnedCounterKey = (editionId: string) => `badges.ambassador_counter.${editionId}`;

/**
 * Numéro suivant : jamais réutilisé, même après l'annulation d'un badge. Un numéro réutilisé pointerait vers
 * le QR ScanHub (identifiant externe) de l'ancien porteur.
 */
async function nextBadgeNumber(editionYear: number, badgeId: string, editionId: string) {
  const [count, burned] = await Promise.all([
    db.userBadge.count({ where: { badgeId, editionId } }),
    db.setting.findUnique({ where: { key: burnedCounterKey(editionId) }, select: { value: true } }),
  ]);
  const next = Math.max(count, Number(burned?.value ?? 0)) + 1;
  return `JNJL-${editionYear}-AMB-${String(next).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────
// Administration
// ─────────────────────────────────────────────────────────────

/** Ambassadeurs ayant signé leur engagement — éligibles à l'attribution du badge. */
export async function listBadgeCandidatesAction(editionId: string) {
  const actor = await requirePermission("badges.manage");
  const regionId = getActorRegionScope(actor);

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      userId: { not: null },
      stage: { in: ["BADGE", "EMBARQUEMENT", "PRESENCE", "ATTESTATION"] },
      engagement: { isNot: null },
      ...(regionId ? { regionId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      stage: true,
      userId: true,
      region: { select: { id: true, name: true } },
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

async function awardBadge(actor: User, applicationId: string) {
  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: { edition: true, engagement: true },
  });
  if (!application) throw new Error("Candidature introuvable");
  assertRegionAccess(actor, application.regionId);
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

  // QR contrôlé par ScanHub : actif seulement une fois l'embarquement validé.
  await syncBadgeQr(userBadge.id, ["PRESENCE", "ATTESTATION"].includes(application.stage));

  await notify({
    userId: application.userId,
    title: "Votre badge est disponible",
    message: `Votre badge d'ambassadeur ${number} est prêt. Présentez-le lors de l'embarquement et à l'événement.`,
    link: "/ambassadeur/badge",
  });

  return userBadge;
}

export async function awardAmbassadorBadgeAction(applicationId: string) {
  const actor = await requirePermission("badges.manage");
  const userBadge = await awardBadge(actor, applicationId);
  await auditAdminAction({
    actorId: actor.id,
    action: "BADGE_AWARDED",
    target: { applicationId, number: userBadge.number },
  });
  return { number: userBadge.number };
}

export async function awardAllAmbassadorBadgesAction(editionId: string) {
  const actor = await requirePermission("badges.manage");
  const regionId = getActorRegionScope(actor);

  const pending = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      stage: "BADGE",
      userId: { not: null },
      engagement: { isNot: null },
      ...(regionId ? { regionId } : {}),
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  // Attribution séquentielle : la numérotation dépend du nombre de badges déjà émis.
  for (const application of pending) {
    await awardBadge(actor, application.id);
  }

  await auditAdminAction({
    actorId: actor.id,
    action: "BADGE_AWARDED",
    target: { editionId, regionId, count: pending.length, bulk: true },
  });
  return { count: pending.length };
}

export type CancelBadgeResult = { ok: true } | { ok: false; reason: string };

/**
 * Annule le badge d'un ambassadeur comme si l'administration ne l'avait pas encore attribué : la fiche badge est
 * supprimée, l'ambassadeur revient à l'étape « Badge » et le QR ScanHub est désactivé. Refusé si l'embarquement
 * est validé ou si une présence est déjà pointée. Le numéro n'est jamais réattribué.
 */
async function cancelBadge(applicationId: string): Promise<CancelBadgeResult> {
  const application = await db.ambassadorApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      editionId: true,
      userId: true,
      stage: true,
      boarding: { select: { status: true } },
    },
  });
  if (!application?.userId) return { ok: false, reason: "Candidature introuvable" };

  const userBadge = await db.userBadge.findFirst({
    where: { userId: application.userId, editionId: application.editionId, badge: { code: "AMBASSADEUR" } },
    select: { id: true, number: true },
  });
  if (!userBadge) return { ok: false, reason: "Aucun badge attribué" };

  if (application.boarding?.status === "EMBARQUE" || ["PRESENCE", "ATTESTATION"].includes(application.stage)) {
    return { ok: false, reason: "L'embarquement est déjà validé : le badge ne peut plus être annulé" };
  }
  const attendance = await db.attendance.count({
    where: { editionId: application.editionId, userId: application.userId },
  });
  if (attendance > 0) return { ok: false, reason: "Une présence est déjà pointée : le badge ne peut plus être annulé" };

  // Le numéro est « brûlé » avant la suppression : il ne sera plus jamais redistribué.
  const burned = Number(userBadge.number?.match(/(\d+)$/)?.[1] ?? 0);
  const key = burnedCounterKey(application.editionId);
  const current = Number((await db.setting.findUnique({ where: { key }, select: { value: true } }))?.value ?? 0);
  await db.setting.upsert({
    where: { key },
    create: { key, value: String(Math.max(current, burned)), description: "Dernier numéro de badge ambassadeur attribué" },
    update: { value: String(Math.max(current, burned)) },
  });

  await db.$transaction([
    db.userBadge.delete({ where: { id: userBadge.id } }),
    db.ambassadorApplication.update({
      where: { id: application.id },
      data: { stage: application.stage === "EMBARQUEMENT" ? "BADGE" : application.stage },
    }),
    // Un embarquement « en attente » créé par la saisie du point focal n'a plus de raison d'être sans badge.
    ...(application.boarding
      ? [db.boarding.deleteMany({ where: { ambassadorApplicationId: application.id } })]
      : []),
  ]);

  // QR ScanHub : désactivé (ScanHub ne permet pas de le supprimer). Sans conséquence si ScanHub ne répond pas.
  if (userBadge.number) {
    try {
      await setBadgeQrActive(userBadge.number, false);
    } catch (error) {
      console.error("ScanHub : désactivation du QR d'un badge annulé en échec", error);
    }
  }
  return { ok: true };
}

/** Annule le badge d'un seul ambassadeur. Réservé au Super Admin. */
export async function cancelAmbassadorBadgeAction(applicationId: string): Promise<CancelBadgeResult> {
  const actor = await requireSuperAdmin();
  const result = await cancelBadge(applicationId);
  await auditAdminAction({
    actorId: actor.id,
    action: "BADGE_CANCELLED",
    target: { applicationId, ok: result.ok, reason: result.ok ? undefined : result.reason },
    status: result.ok ? "SUCCESS" : "FAILURE",
  });
  return result;
}

/** Annule tous les badges attribués de l'édition (ceux qui peuvent l'être). Réservé au Super Admin. */
export async function cancelAllAmbassadorBadgesAction(editionId: string) {
  const actor = await requireSuperAdmin();
  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      userId: { not: null },
      user: { badges: { some: { editionId, badge: { code: "AMBASSADEUR" } } } },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let cancelled = 0;
  const refused: string[] = [];
  for (const application of applications) {
    const result = await cancelBadge(application.id);
    if (result.ok) cancelled += 1;
    else refused.push(result.reason);
  }
  await auditAdminAction({
    actorId: actor.id,
    action: "BADGE_CANCELLED",
    target: { editionId, cancelled, refused: refused.length, bulk: true },
  });
  return { cancelled, refused: refused.length, firstReason: refused[0] ?? null };
}

/**
 * Rejoue la synchronisation ScanHub des badges dont le QR n'a pas encore été créé côté ScanHub
 * (le QR imprimé est encore le simple numéro). Actif seulement pour les ambassadeurs embarqués.
 */
export async function resyncBadgeQrsAction(editionId: string) {
  const actor = await requirePermission("badges.manage");
  const regionId = getActorRegionScope(actor);

  const badges = await db.userBadge.findMany({
    where: { editionId, badge: { code: "AMBASSADEUR" } },
    select: { id: true, number: true, qrCode: true, userId: true },
  });
  const pending = badges.filter(item => item.number && (!item.qrCode || item.qrCode === item.number));

  const applications = await db.ambassadorApplication.findMany({
    where: { editionId, userId: { in: pending.map(item => item.userId) }, ...(regionId ? { regionId } : {}) },
    select: { userId: true, stage: true },
  });
  const stageByUser = new Map(applications.map(application => [application.userId, application.stage]));

  let synced = 0;
  let failed = 0;
  let firstError: string | null = null;
  for (const item of pending) {
    const stage = stageByUser.get(item.userId);
    if (!stage) continue; // hors de la portée régionale de l'acteur
    const result = await syncBadgeQrDetailed(item.id, ["PRESENCE", "ATTESTATION"].includes(stage));
    if (result.ok) synced += 1;
    else {
      failed += 1;
      firstError ??= result.error ?? null;
    }
  }
  return { total: pending.length, synced, failed, error: firstError };
}

/**
 * Impression en lot des badges ambassadeurs attribués. Le serveur rend une « partie » (40 badges) par appel ;
 * le navigateur enchaîne les parties puis assemble un seul PDF. Tri par région puis par nom. Un staff régional
 * n'imprime que sa région. Les badges dont le QR n'existe pas encore dans ScanHub sont ignorés et comptés
 * (« Resynchroniser les QR » d'abord) : on n'imprime jamais un QR que l'entrée refuserait.
 */
export async function printAmbassadorBadgesAction(editionId: string, requestedRegionId?: string | null, part = 0) {
  const actor = await requirePermission("badges.manage");
  const regionId = getActorRegionScope(actor) ?? (requestedRegionId || null);

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId,
      status: "RETENU",
      userId: { not: null },
      ...(regionId ? { regionId } : {}),
      user: { badges: { some: { editionId, badge: { code: "AMBASSADEUR" } } } },
    },
    select: {
      firstName: true,
      lastName: true,
      region: { select: { name: true } },
      user: {
        select: {
          badges: {
            where: { editionId, badge: { code: "AMBASSADEUR" } },
            select: { number: true, qrCode: true, awardedAt: true },
          },
        },
      },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });

  const items: DesignBadgeItem[] = [];
  let notSynced = 0;
  for (const application of applications) {
    const badge = application.user?.badges[0];
    if (!badge?.number) continue;
    if (!badge.qrCode || badge.qrCode === badge.number) {
      notSynced += 1;
      continue;
    }
    items.push({
      variant: "ambassador",
      params: {
        fullName: `${application.firstName} ${application.lastName}`,
        region: application.region.name,
        number: badge.number,
        qrValue: badge.qrCode,
        awardedAt: badge.awardedAt,
      },
    });
  }

  return {
    part: await renderBadgePart(items, part),
    printed: items.length,
    notSynced,
    regionName: regionId ? (applications[0]?.region.name ?? null) : null,
  };
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

  const eventDate =
    edition.startDate && edition.endDate
      ? edition.startDate.getTime() === edition.endDate.getTime()
        ? edition.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
        : `${edition.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${edition.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
      : null;

  return {
    stage: application.stage,
    hasSignedEngagement: !!application.engagement,
    boardingStatus: application.boarding?.status ?? "EN_ATTENTE",
    fullName: `${application.firstName} ${application.lastName}`,
    region: application.region.name,
    editionId: edition.id,
    editionName: `${edition.name} (${edition.year})`,
    editionLocation: edition.location,
    eventDate,
    badgeBackgroundColor: edition.badgeBackgroundColor,
    badge: userBadge
      ? {
          label: userBadge.badge.label,
          number: userBadge.number,
          qrValue: userBadge.qrCode ?? userBadge.number,
          awardedAt: userBadge.awardedAt,
          qrDataUrl,
        }
      : null,
  };
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
    editionId: data.editionId,
    label: data.badge.label,
    fullName: data.fullName,
    region: data.region,
    editionName: data.editionName,
    editionLocation: data.editionLocation,
    eventDate: data.eventDate,
    backgroundColor: data.badgeBackgroundColor,
    number: data.badge.number,
    qrValue: data.badge.qrValue ?? undefined,
    variant: "ambassador",
    awardedAt: data.badge.awardedAt,
    logo: await loadPublicImage("jnjl.jpg"),
    partnerLogos: await Promise.all(PARTNER_LOGO_PATHS.map(loadPublicImage)),
  });

  return {
    filename: `badge-${data.badge.number}.pdf`,
    base64: Buffer.from(pdf).toString("base64"),
  };
}
