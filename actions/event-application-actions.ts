"use server";

import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";

const applicationInclude = {
  region: { select: { id: true, name: true, code: true } },
  edition: { select: { id: true, name: true, year: true } },
  user: { select: { id: true, name: true, email: true } },
  participation: { select: { badgeNumber: true } },
} as const;

/**
 * L'inscription à l'événement ne passe plus par une validation admin (§8 du guide admin) :
 * chaque candidature soumise vaut confirmation immédiate, avec badge généré à l'inscription
 * (voir `lib/participant-registration.ts`). Ces actions ne servent donc plus qu'à
 * consulter, filtrer et exporter la liste des participants.
 */
export async function listEventApplicationsAction() {
  await requirePermission("applications.event.manage");
  return db.eventApplication.findMany({
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getEventApplicationAction(id: string) {
  await requirePermission("applications.event.manage");
  const application = await db.eventApplication.findUnique({
    where: { id },
    include: applicationInclude,
  });
  if (!application) throw new Error("Candidature introuvable");
  return application;
}

export type ParticipantExportFilters = { regionName?: string; gender?: string; search?: string };
type ExportResult = { ok: true; filename: string; base64: string } | { ok: false; error: string };

/** Participants à exporter, avec les mêmes filtres que la page (région, sexe, recherche). */
async function loadParticipantsForExport(filters: ParticipantExportFilters) {
  await requirePermission("applications.event.manage");
  const rows = await db.eventApplication.findMany({
    where: {
      ...(filters.regionName ? { region: { name: filters.regionName } } : {}),
      ...(filters.gender ? { gender: filters.gender } : {}),
    },
    include: applicationInclude,
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }],
  });
  const query = filters.search?.trim().toLowerCase();
  return rows
    .filter(
      item =>
        !query || `${item.firstName} ${item.lastName} ${item.email} ${item.region?.name ?? ""}`.toLowerCase().includes(query)
    )
    .map(item => ({
      name: `${item.firstName} ${item.lastName}`,
      gender: item.gender === "FEMININ" ? "Féminin" : item.gender === "MASCULIN" ? "Masculin" : "",
      phone: item.phone,
      email: item.email,
      region: item.region?.name ?? "",
      profession: item.profession ?? "",
      badge: item.participation?.badgeNumber ?? "",
      date: item.createdAt.toLocaleDateString("fr-FR"),
    }));
}

export async function exportEventApplicationsExcelAction(filters: ParticipantExportFilters): Promise<ExportResult> {
  const rows = await loadParticipantsForExport(filters);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Participants");
  sheet.columns = [
    { header: "N°", key: "n", width: 6 },
    { header: "Nom et prénom", key: "name", width: 32 },
    { header: "Sexe", key: "gender", width: 10 },
    { header: "Téléphone", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 32 },
    { header: "Région", key: "region", width: 16 },
    { header: "Profession", key: "profession", width: 24 },
    { header: "N° badge", key: "badge", width: 24 },
    { header: "Inscrit le", key: "date", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row, index) => sheet.addRow({ n: index + 1, ...row }));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { ok: true, filename: "participants-jnjl.xlsx", base64: buffer.toString("base64") };
}

export async function exportEventApplicationsPdfAction(filters: ParticipantExportFilters): Promise<ExportResult> {
  const rows = await loadParticipantsForExport(filters);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842; // A4 paysage
  const pageHeight = 595;
  const margin = 36;
  const rowHeight = 19;
  const columns = [
    { title: "N°", x: margin, width: 28, key: "n" },
    { title: "Nom et prénom", x: margin + 28, width: 190, key: "name" },
    { title: "Sexe", x: margin + 218, width: 50, key: "gender" },
    { title: "Téléphone", x: margin + 268, width: 90, key: "phone" },
    { title: "Région", x: margin + 358, width: 90, key: "region" },
    { title: "Profession", x: margin + 448, width: 130, key: "profession" },
    { title: "N° badge", x: margin + 578, width: 150, key: "badge" },
  ] as const;
  // Helvetica standard (WinAnsi) : les caractères hors plage sont remplacés pour ne pas faire échouer le PDF.
  const safe = (text: string) => text.replace(/[^\x20-\x7E -ÿ]/g, "?");
  const clip = (text: string, width: number) => {
    let value = safe(text);
    while (value.length > 1 && font.widthOfTextAtSize(value, 9) > width - 4) value = value.slice(0, -1);
    return value;
  };

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  const header = () => {
    page.drawText("Participants à la JNJL", { x: margin, y, size: 15, font: bold, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;
    page.drawText(`${rows.length} participant(s)`, { x: margin, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
    y -= 22;
    page.drawRectangle({
      x: margin - 4,
      y: y - 5,
      width: pageWidth - 2 * margin + 8,
      height: rowHeight,
      color: rgb(0.92, 0.92, 0.92),
    });
    for (const column of columns) page.drawText(column.title, { x: column.x, y, size: 9, font: bold });
    y -= rowHeight;
  };
  header();
  rows.forEach((row, index) => {
    if (y < margin + rowHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      header();
    }
    const cells: Record<string, string> = { n: String(index + 1), ...row };
    for (const column of columns) {
      page.drawText(clip(cells[column.key] ?? "", column.width), { x: column.x, y, size: 9, font });
    }
    y -= rowHeight;
  });
  return { ok: true, filename: "participants-jnjl.pdf", base64: Buffer.from(await doc.save()).toString("base64") };
}
