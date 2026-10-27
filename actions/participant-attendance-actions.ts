"use server";

import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { getActorRegionScope } from "@/lib/region-scope";

/**
 * Pointage des participants à l'événement (inscription publique, sans compte), séparé de celui des ambassadeurs.
 * Un point focal ne voit que les participants de sa région ; un admin voit tout. Les inscriptions annulées sont exclues.
 */

export interface ParticipantAttendanceRow {
  id: string;
  fullName: string;
  gender: string;
  phone: string;
  region: string;
  badgeNumber: string;
  /** Premier passage (null = pas encore pointé). */
  firstCheckIn: Date | null;
  /** Nombre de pointages (événement + sessions). */
  checkIns: number;
}

async function loadRows(editionId: string): Promise<ParticipantAttendanceRow[]> {
  const actor = await requirePermission("attendance.manage");
  const regionId = getActorRegionScope(actor);

  const applications = await db.eventApplication.findMany({
    where: { editionId, cancelledAt: null, ...(regionId ? { regionId } : {}) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      phone: true,
      region: { select: { name: true } },
      participation: {
        select: { badgeNumber: true, attendances: { select: { checkedAt: true }, orderBy: { checkedAt: "asc" } } },
      },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });

  return applications.map(application => {
    const attendances = application.participation?.attendances ?? [];
    return {
      id: application.id,
      fullName: `${application.firstName} ${application.lastName}`,
      gender: application.gender === "FEMININ" ? "Féminin" : application.gender === "MASCULIN" ? "Masculin" : "",
      phone: application.phone,
      region: application.region?.name ?? "",
      badgeNumber: application.participation?.badgeNumber ?? "",
      firstCheckIn: attendances[0]?.checkedAt ?? null,
      checkIns: attendances.length,
    };
  });
}

/** Participants de l'édition avec leur état de pointage. */
export async function listParticipantAttendanceAction(editionId: string) {
  return loadRows(editionId);
}

export type ParticipantAttendanceFilters = { region?: string; status?: "ALL" | "PRESENT" | "ABSENT"; search?: string };

export async function exportParticipantAttendanceExcelAction(
  editionId: string,
  filters: ParticipantAttendanceFilters
): Promise<{ ok: true; filename: string; base64: string } | { ok: false; error: string }> {
  const query = filters.search?.trim().toLowerCase();
  const rows = (await loadRows(editionId)).filter(
    row =>
      (!filters.region || row.region === filters.region) &&
      (!filters.status || filters.status === "ALL" || (filters.status === "PRESENT") === !!row.firstCheckIn) &&
      (!query || `${row.fullName} ${row.phone} ${row.badgeNumber}`.toLowerCase().includes(query))
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pointage participants");
  sheet.columns = [
    { header: "N°", key: "n", width: 6 },
    { header: "Nom et prénom", key: "name", width: 32 },
    { header: "Sexe", key: "gender", width: 10 },
    { header: "Téléphone", key: "phone", width: 18 },
    { header: "Région", key: "region", width: 16 },
    { header: "N° badge", key: "badge", width: 24 },
    { header: "Présence", key: "present", width: 12 },
    { header: "Premier pointage", key: "first", width: 20 },
    { header: "Pointages", key: "count", width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row, index) =>
    sheet.addRow({
      n: index + 1,
      name: row.fullName,
      gender: row.gender,
      phone: row.phone,
      region: row.region,
      badge: row.badgeNumber,
      present: row.firstCheckIn ? "Présent" : "Absent",
      first: row.firstCheckIn ? row.firstCheckIn.toLocaleString("fr-FR") : "",
      count: row.checkIns,
    })
  );
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { ok: true, filename: "pointage-participants-jnjl.xlsx", base64: buffer.toString("base64") };
}
