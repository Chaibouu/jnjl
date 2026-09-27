"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { formatGender } from "@/lib/gender";

const STAGE_ORDER = [
  "CANDIDATURE",
  "PAIEMENT",
  "FORMATION",
  "QCM",
  "CLASSEMENT",
  "SELECTION",
  "REPECHAGE",
  "ENGAGEMENT",
  "BADGE",
  "EMBARQUEMENT",
  "PRESENCE",
  "ATTESTATION",
] as const;

/** Tableau de bord d'une édition : chiffres nationaux + détail par région. */
export async function getEditionStatsAction(editionId: string) {
  await requirePermission("stats.view");

  const [ambassadors, quotas, eventApplications, leaderCount, badgeCount, attendedUsers, regions] =
    await Promise.all([
      db.ambassadorApplication.findMany({
        where: { editionId },
        select: {
          regionId: true,
          status: true,
          stage: true,
          gender: true,
          payment: { select: { status: true, amount: true } },
          selection: { select: { status: true } },
          boarding: { select: { status: true } },
        },
      }),
      db.regionalQuota.findMany({ where: { editionId }, select: { regionId: true, quota: true } }),
      db.eventApplication.findMany({
        where: { editionId },
        select: { status: true, gender: true, regionId: true },
      }),
      db.leaderApplication.count({ where: { editionId } }),
      db.userBadge.count({ where: { editionId } }),
      db.attendance.findMany({
        where: { editionId, userId: { not: null } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      db.region.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

  /** Normalise un sexe brut ("MASCULIN" | "FEMININ" | null) en clé de regroupement. */
  const genderKey = (value: string | null) =>
    value === "MASCULIN" || value === "FEMININ" ? value : "NON_RENSEIGNE";

  const quotaByRegion = new Map(quotas.map(item => [item.regionId, item.quota]));

  type Row = {
    regionId: string;
    name: string;
    quota: number;
    candidatures: number;
    paid: number;
    selected: number;
    boarded: number;
    present: number;
    participants: number;
  };
  const rows = new Map<string, Row>(
    regions.map(region => [
      region.id,
      {
        regionId: region.id,
        name: region.name,
        quota: quotaByRegion.get(region.id) ?? 0,
        candidatures: 0,
        paid: 0,
        selected: 0,
        boarded: 0,
        present: 0,
        participants: 0,
      },
    ])
  );

  const byStage = new Map<string, number>(STAGE_ORDER.map(stage => [stage, 0]));
  const byStatus = new Map<string, number>();
  const ambassadorsByGender = new Map<string, number>();
  let revenue = 0;

  for (const application of ambassadors) {
    byStatus.set(application.status, (byStatus.get(application.status) ?? 0) + 1);
    if (application.status === "RETENU") {
      byStage.set(application.stage, (byStage.get(application.stage) ?? 0) + 1);
    }
    const genderGroup = genderKey(application.gender);
    ambassadorsByGender.set(genderGroup, (ambassadorsByGender.get(genderGroup) ?? 0) + 1);

    const row = rows.get(application.regionId);
    if (!row) continue;
    row.candidatures += 1;
    if (application.payment?.status === "VALIDE") {
      row.paid += 1;
      revenue += application.payment.amount;
    }
    if (application.selection?.status === "SELECTIONNE") row.selected += 1;
    if (application.boarding?.status === "EMBARQUE") row.boarded += 1;
    if (application.stage === "ATTESTATION" && application.status === "RETENU") row.present += 1;
  }

  const eventByStatus = new Map<string, number>();
  const participantsByGender = new Map<string, number>();
  for (const application of eventApplications) {
    eventByStatus.set(application.status, (eventByStatus.get(application.status) ?? 0) + 1);
    const genderGroup = genderKey(application.gender);
    participantsByGender.set(genderGroup, (participantsByGender.get(genderGroup) ?? 0) + 1);
    if (application.regionId) {
      const row = rows.get(application.regionId);
      if (row) row.participants += 1;
    }
  }

  const regionRows = Array.from(rows.values()).filter(
    row => row.candidatures > 0 || row.quota > 0 || row.participants > 0
  );

  return {
    ambassadors: {
      total: ambassadors.length,
      paid: regionRows.reduce((sum, row) => sum + row.paid, 0),
      selected: regionRows.reduce((sum, row) => sum + row.selected, 0),
      boarded: regionRows.reduce((sum, row) => sum + row.boarded, 0),
      present: regionRows.reduce((sum, row) => sum + row.present, 0),
      revenue,
      byStatus: Array.from(byStatus, ([status, count]) => ({ status, count })),
      byStage: STAGE_ORDER.map(stage => ({ stage, count: byStage.get(stage) ?? 0 })),
      byGender: Array.from(ambassadorsByGender, ([gender, count]) => ({ gender, count })),
    },
    participants: {
      total: eventApplications.length,
      byStatus: Array.from(eventByStatus, ([status, count]) => ({ status, count })),
      byGender: Array.from(participantsByGender, ([gender, count]) => ({ gender, count })),
    },
    leaders: leaderCount,
    badges: badgeCount,
    attendedPeople: attendedUsers.length,
    regions: regionRows,
  };
}

// ─────────────────────────────────────────────────────────────
// Exports CSV
// ─────────────────────────────────────────────────────────────

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => {
    let text = value == null ? "" : String(value);
    // Neutralise l'injection de formule dans Excel / Sheets.
    // Les numéros (« +227 90 00 00 00 ») sont laissés tels quels.
    const looksNumeric = /^[+-]?[\d\s().-]+$/.test(text);
    if (/^[=+\-@\t\r]/.test(text) && !looksNumeric) text = `'${text}`;
    return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers, ...rows].map(line => line.map(escape).join(";"));
  // BOM UTF-8 : Excel lit correctement les accents.
  return `﻿${lines.join("\r\n")}`;
}

const formatDate = (date: Date | null | undefined) =>
  date ? date.toISOString().slice(0, 10) : "";

export async function exportAmbassadorsCsvAction(editionId: string) {
  await requirePermission("applications.ambassador.manage");

  const applications = await db.ambassadorApplication.findMany({
    where: { editionId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      gender: true,
      status: true,
      stage: true,
      quizScore: true,
      rank: true,
      createdAt: true,
      region: { select: { name: true } },
      payment: { select: { status: true } },
      selection: { select: { status: true } },
      boarding: { select: { status: true } },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });

  return toCsv(
    ["Nom", "Prénom", "Email", "Téléphone", "Sexe", "Région", "Statut", "Étape", "Score QCM", "Rang", "Paiement", "Sélection", "Embarquement", "Date de candidature"],
    applications.map(a => [
      a.lastName,
      a.firstName,
      a.email,
      a.phone,
      formatGender(a.gender),
      a.region.name,
      a.status,
      a.stage,
      a.quizScore,
      a.rank,
      a.payment?.status ?? "",
      a.selection?.status ?? "",
      a.boarding?.status ?? "",
      formatDate(a.createdAt),
    ])
  );
}

export async function exportParticipantsCsvAction(editionId: string) {
  await requirePermission("applications.event.manage");

  const applications = await db.eventApplication.findMany({
    where: { editionId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      gender: true,
      profession: true,
      hasParticipatedBefore: true,
      status: true,
      createdAt: true,
      region: { select: { name: true } },
    },
    orderBy: { lastName: "asc" },
  });

  return toCsv(
    ["Nom", "Prénom", "Email", "Téléphone", "Sexe", "Région", "Profession", "Déjà participé", "Statut", "Date de candidature"],
    applications.map(a => [
      a.lastName,
      a.firstName,
      a.email,
      a.phone,
      formatGender(a.gender),
      a.region?.name ?? "",
      a.profession ?? "",
      a.hasParticipatedBefore == null ? "" : a.hasParticipatedBefore ? "Oui" : "Non",
      a.status,
      formatDate(a.createdAt),
    ])
  );
}
