"use server";

import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/actions/requirePermission";
import { audit } from "@/lib/audit";
import { AUDIENCES, parseEmailList } from "@/lib/email-audience-shared";
import { pickAudience, resolveAudiences, uniqueRecipients, type Audience } from "@/lib/email-audience";
import { cleanCampaignBody, hasCampaignContent, renderCampaignHtml } from "@/lib/email-campaign";
import { describeMailError, sendCampaignEmail } from "@/lib/mail";

/**
 * Envois groupés (candidats, ambassadeurs acceptés, participants, utilisateurs, tout le monde) — réservés au
 * Super Admin.
 *
 * Le plan gratuit du service d'e-mails limite le nombre d'envois par jour. Les destinataires sont donc figés à la
 * création, l'envoi se fait par petits lots et peut être repris le lendemain, et une réserve est gardée pour les
 * e-mails indispensables (accès, mot de passe oublié) afin qu'une campagne ne les prive jamais de place.
 */

export type CampaignCounts = { total: number; sent: number; failed: number; pending: number };

export type CampaignSummary = {
  id: string;
  subject: string;
  audience: Audience;
  regionName: string | null;
  status: string;
  pausedReason: string | null;
  createdAt: string;
  counts: CampaignCounts;
};

export type EmailLimits = { daily: number; reserve: number; sentToday: number; available: number };

export type EmailCenter = {
  campaigns: CampaignSummary[];
  limits: EmailLimits;
  regions: { id: string; name: string }[];
  counts: Record<Audience, number>;
};

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const LIMIT_KEYS = { daily: "email.daily_limit", reserve: "email.reserve" } as const;
const DEFAULT_DAILY = 100;
const DEFAULT_RESERVE = 20;
const CHUNK = 6;
const MAX_RECIPIENTS = 5000;

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const startOfTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// ─── Limites quotidiennes ────────────────────────────────────────────────────

async function getLimits(): Promise<EmailLimits> {
  const [rows, sentToday] = await Promise.all([
    db.setting.findMany({ where: { key: { in: Object.values(LIMIT_KEYS) } }, select: { key: true, value: true } }),
    db.emailLog.count({
      where: { createdAt: { gte: startOfTodayUtc() }, status: { in: ["ACCEPTED", "DELIVERED", "BOUNCED", "COMPLAINED"] } },
    }),
  ]);
  const read = (key: string, fallback: number) => {
    const raw = rows.find(row => row.key === key)?.value;
    const value = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
  };
  const daily = read(LIMIT_KEYS.daily, DEFAULT_DAILY);
  const reserve = Math.min(read(LIMIT_KEYS.reserve, DEFAULT_RESERVE), daily);
  return { daily, reserve, sentToday, available: Math.max(0, daily - reserve - sentToday) };
}

export async function saveEmailLimitsAction(input: { daily: number; reserve: number }): Promise<Result<{ limits: EmailLimits }>> {
  await requireSuperAdmin();
  const daily = Math.floor(Number(input.daily));
  const reserve = Math.floor(Number(input.reserve));
  if (!Number.isFinite(daily) || daily < 1 || daily > 100000) return { ok: false, error: "Limite quotidienne invalide" };
  if (!Number.isFinite(reserve) || reserve < 0 || reserve >= daily) {
    return { ok: false, error: "La réserve doit être inférieure à la limite quotidienne" };
  }
  for (const [key, value] of [
    [LIMIT_KEYS.daily, String(daily)],
    [LIMIT_KEYS.reserve, String(reserve)],
  ] as const) {
    await db.setting.upsert({
      where: { key },
      create: { key, value, description: "Limites d'envoi d'e-mails (plan du fournisseur)" },
      update: { value },
    });
  }
  return { ok: true, limits: await getLimits() };
}

// ─── Lecture ─────────────────────────────────────────────────────────────────

async function summaries(where: { id?: string } = {}): Promise<CampaignSummary[]> {
  const campaigns = await db.emailCampaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, subject: true, audience: true, regionId: true, status: true, pausedReason: true, createdAt: true },
  });
  if (campaigns.length === 0) return [];

  const ids = campaigns.map(campaign => campaign.id);
  const regionIds = [...new Set(campaigns.flatMap(campaign => (campaign.regionId ? [campaign.regionId] : [])))];
  const [groups, regions] = await Promise.all([
    db.emailCampaignRecipient.groupBy({ by: ["campaignId", "status"], where: { campaignId: { in: ids } }, _count: { _all: true } }),
    regionIds.length ? db.region.findMany({ where: { id: { in: regionIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);

  return campaigns.map(campaign => {
    const counts: CampaignCounts = { total: 0, sent: 0, failed: 0, pending: 0 };
    for (const group of groups) {
      if (group.campaignId !== campaign.id) continue;
      const n = group._count._all;
      counts.total += n;
      if (group.status === "SENT") counts.sent += n;
      else if (group.status === "FAILED") counts.failed += n;
      else counts.pending += n; // PENDING ou SENDING
    }
    return {
      id: campaign.id,
      subject: campaign.subject,
      audience: campaign.audience as Audience,
      regionName: regions.find(region => region.id === campaign.regionId)?.name ?? null,
      status: campaign.status,
      pausedReason: campaign.pausedReason,
      createdAt: campaign.createdAt.toISOString(),
      counts,
    };
  });
}

async function audienceCounts(regionId?: string | null): Promise<Record<Audience, number>> {
  const all = await resolveAudiences(regionId);
  const counts = {} as Record<Audience, number>;
  for (const { code } of AUDIENCES) counts[code] = pickAudience(all, code).length;
  return counts;
}

export async function getEmailCenterAction(): Promise<EmailCenter> {
  await requireSuperAdmin();
  const [campaigns, limits, regions, counts] = await Promise.all([
    summaries(),
    getLimits(),
    db.region.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    audienceCounts(null),
  ]);
  return { campaigns, limits, regions, counts };
}

/** Nombre de destinataires de chaque groupe, pour une région donnée (ou toutes). */
export async function getAudienceCountsAction(regionId: string | null): Promise<Record<Audience, number>> {
  await requireSuperAdmin();
  return audienceCounts(regionId || null);
}

export async function getCampaignDetailAction(
  campaignId: string
): Promise<Result<{ summary: CampaignSummary; failures: { email: string; name: string | null; error: string | null }[] }>> {
  await requireSuperAdmin();
  const [summary] = await summaries({ id: campaignId });
  if (!summary) return { ok: false, error: "Campagne introuvable" };
  const failures = await db.emailCampaignRecipient.findMany({
    where: { campaignId, status: "FAILED" },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { email: true, name: true, error: true },
  });
  return { ok: true, summary, failures };
}

// ─── Aperçu et test ──────────────────────────────────────────────────────────

export async function previewCampaignAction(input: { subject: string; body: string }): Promise<{ html: string }> {
  await requireSuperAdmin();
  return { html: renderCampaignHtml(input.subject.trim() || "Objet du message", input.body, "Aminata") };
}

/** Envoie le message tel quel à l'adresse du Super Admin connecté, avant l'envoi réel. */
export async function sendTestEmailAction(input: { subject: string; body: string }): Promise<Result<{ to: string }>> {
  const actor = await requireSuperAdmin();
  if (!actor.email) return { ok: false, error: "Votre compte n'a pas d'adresse e-mail" };
  if (input.subject.trim().length < 3) return { ok: false, error: "Saisissez un objet" };
  if (!hasCampaignContent(input.body)) return { ok: false, error: "Rédigez le message avant d'envoyer un test" };
  try {
    await sendCampaignEmail({
      to: actor.email,
      subject: `[Test] ${input.subject.trim()}`,
      bodyHtml: input.body,
      firstName: actor.name?.split(" ")[0] ?? null,
    });
    return { ok: true, to: actor.email };
  } catch (error) {
    return { ok: false, error: describeMailError(error) };
  }
}

// ─── Création et envoi ───────────────────────────────────────────────────────

/** Destinataires finaux : le groupe choisi + les adresses saisies à la main, dédoublonnés. */
async function buildRecipients(audience: Audience, regionId: string | null, extraEmails: string) {
  const manual = parseEmailList(extraEmails ?? "");
  const group = audience === "MANUAL" ? [] : pickAudience(await resolveAudiences(regionId), audience);
  const recipients = uniqueRecipients([...group, ...manual.valid.map(email => ({ email, name: null }))]);
  return { recipients, manual };
}

/** Nombre exact de destinataires (groupe + adresses saisies) et adresses saisies refusées, avant l'envoi. */
export async function getRecipientPreviewAction(input: {
  audience: Audience;
  regionId: string | null;
  extraEmails: string;
}): Promise<{ total: number; manualValid: number; manualInvalid: string[] }> {
  await requireSuperAdmin();
  const { recipients, manual } = await buildRecipients(input.audience, input.regionId || null, input.extraEmails);
  return { total: recipients.length, manualValid: manual.valid.length, manualInvalid: manual.invalid.slice(0, 20) };
}

export async function createCampaignAction(input: {
  subject: string;
  body: string;
  audience: Audience;
  regionId: string | null;
  /** Adresses saisies à la main (texte brut), ajoutées au groupe choisi. */
  extraEmails?: string;
}): Promise<Result<{ campaignId: string; total: number }>> {
  const actor = await requireSuperAdmin();

  const subject = input.subject.replace(/[\r\n]+/g, " ").trim();
  if (subject.length < 3 || subject.length > 150) return { ok: false, error: "L'objet doit faire entre 3 et 150 caractères" };
  if (!hasCampaignContent(input.body)) return { ok: false, error: "Le message est vide : rédigez-le avant d'envoyer" };
  if (!AUDIENCES.some(item => item.code === input.audience)) return { ok: false, error: "Groupe de destinataires invalide" };

  const regionId = input.regionId || null;
  if (regionId && !(await db.region.findUnique({ where: { id: regionId }, select: { id: true } }))) {
    return { ok: false, error: "Région introuvable" };
  }

  const { recipients, manual } = await buildRecipients(input.audience, regionId, input.extraEmails ?? "");
  if (manual.invalid.length > 0) {
    return { ok: false, error: `Adresse(s) invalide(s) : ${manual.invalid.slice(0, 5).join(", ")}${manual.invalid.length > 5 ? "…" : ""}` };
  }
  if (recipients.length === 0) {
    return {
      ok: false,
      error: input.audience === "MANUAL" ? "Saisissez au moins une adresse e-mail valide" : "Aucun destinataire pour ce groupe : rien à envoyer",
    };
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return { ok: false, error: `Trop de destinataires (${recipients.length}) : limitez par région (maximum ${MAX_RECIPIENTS})` };
  }

  const campaign = await db.emailCampaign.create({
    data: {
      subject,
      body: cleanCampaignBody(input.body),
      audience: input.audience,
      regionId,
      status: "DRAFT",
      createdById: actor.id,
    },
    select: { id: true },
  });
  for (let start = 0; start < recipients.length; start += 500) {
    await db.emailCampaignRecipient.createMany({
      data: recipients.slice(start, start + 500).map(recipient => ({ campaignId: campaign.id, email: recipient.email, name: recipient.name })),
      skipDuplicates: true,
    });
  }

  await audit({
    userId: actor.id,
    action: "EMAIL_CAMPAIGN_CREATED",
    status: "SUCCESS",
    metadata: { campaignId: campaign.id, audience: input.audience, regionId, recipients: recipients.length, manualAddresses: manual.valid.length },
  });
  return { ok: true, campaignId: campaign.id, total: recipients.length };
}

export type ChunkResult = {
  sent: number;
  failed: number;
  pending: number;
  status: string;
  pausedReason: string | null;
};

/**
 * Envoie le prochain petit lot d'une campagne. Appelée en boucle par l'écran jusqu'à la fin ou jusqu'à une
 * pause (limite du jour atteinte, quota du fournisseur). Reprendre plus tard repart des destinataires restants.
 */
export async function sendCampaignChunkAction(campaignId: string): Promise<Result<ChunkResult>> {
  await requireSuperAdmin();
  const campaign = await db.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: "Campagne introuvable" };

  // Un envoi interrompu en cours de route (onglet fermé…) ne doit pas bloquer ses destinataires.
  await db.emailCampaignRecipient.updateMany({
    where: { campaignId, status: "SENDING", updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
    data: { status: "PENDING" },
  });

  const finish = async (status: string, pausedReason: string | null, sent: number, failed: number): Promise<Result<ChunkResult>> => {
    const pending = await db.emailCampaignRecipient.count({ where: { campaignId, status: { in: ["PENDING", "SENDING"] } } });
    const finalStatus = pending === 0 ? "DONE" : status;
    await db.emailCampaign.update({ where: { id: campaignId }, data: { status: finalStatus, pausedReason: finalStatus === "DONE" ? null : pausedReason } });
    return { ok: true, sent, failed, pending, status: finalStatus, pausedReason: finalStatus === "DONE" ? null : pausedReason };
  };

  const limits = await getLimits();
  if (limits.available <= 0) {
    return finish(
      "PAUSED",
      `Limite du jour atteinte (${limits.sentToday} e-mails envoyés, dont une réserve de ${limits.reserve} gardée pour les accès). Reprenez demain.`,
      0,
      0
    );
  }

  const batch = await db.emailCampaignRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    orderBy: { email: "asc" },
    take: Math.min(CHUNK, limits.available),
    select: { id: true, email: true, name: true },
  });
  if (batch.length === 0) return finish("DONE", null, 0, 0);

  await db.emailCampaign.update({ where: { id: campaignId }, data: { status: "SENDING", pausedReason: null } });

  let sent = 0;
  let failed = 0;
  for (const recipient of batch) {
    // Prise en charge individuelle : deux lots lancés en même temps ne prennent jamais le même destinataire.
    const claimed = await db.emailCampaignRecipient.updateMany({ where: { id: recipient.id, status: "PENDING" }, data: { status: "SENDING" } });
    if (claimed.count === 0) continue;

    try {
      await sendCampaignEmail({ to: recipient.email, subject: campaign.subject, bodyHtml: campaign.body, firstName: recipient.name });
      await db.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "SENT", sentAt: new Date(), error: null } });
      sent += 1;
    } catch (error) {
      const reason = describeMailError(error);
      if (/Limite d'envoi/.test(reason)) {
        // Quota du fournisseur : ce destinataire n'est pas en cause, il reste à envoyer ; on arrête tout.
        await db.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "PENDING" } });
        return finish("PAUSED", reason, sent, failed);
      }
      await db.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "FAILED", error: reason.slice(0, 300) } });
      failed += 1;
    }
    await pause(600); // le fournisseur limite le débit à 2 requêtes par seconde
  }

  return finish("SENDING", null, sent, failed);
}

/** Remet en file d'attente les destinataires dont l'envoi a échoué. */
export async function retryFailedRecipientsAction(campaignId: string): Promise<Result<{ requeued: number }>> {
  await requireSuperAdmin();
  const result = await db.emailCampaignRecipient.updateMany({
    where: { campaignId, status: "FAILED" },
    data: { status: "PENDING", error: null },
  });
  if (result.count > 0) {
    await db.emailCampaign.update({ where: { id: campaignId }, data: { status: "PAUSED", pausedReason: "Prête à reprendre" } });
  }
  return { ok: true, requeued: result.count };
}

export async function deleteCampaignAction(campaignId: string): Promise<Result<object>> {
  await requireSuperAdmin();
  await db.emailCampaign.deleteMany({ where: { id: campaignId } });
  return { ok: true };
}
