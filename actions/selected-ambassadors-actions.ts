"use server";

import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { getActorRegionScope } from "@/lib/region-scope";
import type { User } from "@/types/user";

/**
 * Liste finale des ambassadeurs sélectionnés (statut RETENU) de l'édition active.
 * - Un staff rattaché à une région voit uniquement sa région ;
 * - un admin / super admin voit tout et peut filtrer par région.
 * Filtre sur le mode de paiement : en ligne (plateforme), via le point focal, ou pas encore payé.
 */

export type PaymentChannelFilter = "ALL" | "ONLINE" | "POINT_FOCAL";

export interface SelectedAmbassadorRow {
  id: string;
  fullName: string;
  gender: string;
  phone: string;
  email: string;
  region: string;
  channel: "ONLINE" | "POINT_FOCAL";
}

const CHANNEL_LABEL: Record<SelectedAmbassadorRow["channel"], string> = {
  ONLINE: "En ligne (plateforme)",
  POINT_FOCAL: "Via le point focal",
};

interface Scope {
  isAdmin: boolean;
  /** Région imposée (staff rattaché) ; null = accès national. */
  regionId: string | null;
}

async function resolveScope(): Promise<Scope | null> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) return null;

  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return { isAdmin: true, regionId: null };
  if (user.role === "STAFF") return { isAdmin: false, regionId: getActorRegionScope(user) };

  // Les ambassadeurs (et tout autre rôle) n'ont pas accès à cette liste.
  return null;
}

const EMPTY_COUNTS = { total: 0, online: 0, pointFocal: 0, women: 0, men: 0 };

async function loadRows(channel: PaymentChannelFilter, requestedRegionId?: string) {
  const scope = await resolveScope();
  if (!scope) return null;

  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false }, select: { id: true } });
  if (!edition) return { scope, rows: [] as SelectedAmbassadorRow[], counts: EMPTY_COUNTS, regionLabel: "" };

  const regionId = scope.regionId ?? (scope.isAdmin && requestedRegionId ? requestedRegionId : null);

  const applications = await db.ambassadorApplication.findMany({
    where: { editionId: edition.id, status: "RETENU", payment: { is: { status: "VALIDE" } }, ...(regionId ? { regionId } : {}) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      phone: true,
      email: true,
      region: { select: { name: true } },
      payment: { select: { status: true, method: true } },
    },
    orderBy: [{ region: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
  });

  const rows: SelectedAmbassadorRow[] = applications.map(application => {
    return {
      id: application.id,
      fullName: `${application.firstName} ${application.lastName}`,
      gender: application.gender === "FEMININ" ? "Féminin" : application.gender === "MASCULIN" ? "Masculin" : "",
      phone: application.phone,
      email: application.email,
      region: application.region.name,
      channel: application.payment?.method === "ONLINE" ? "ONLINE" : "POINT_FOCAL",
    };
  });

  const filtered = channel === "ALL" ? rows : rows.filter(row => row.channel === channel);
  const regionLabel = regionId ? (filtered[0]?.region ?? rows[0]?.region ?? "") : "Toutes les régions";
  const counts = {
    total: rows.length,
    online: rows.filter(row => row.channel === "ONLINE").length,
    pointFocal: rows.filter(row => row.channel === "POINT_FOCAL").length,
    women: rows.filter(row => row.gender === "Féminin").length,
    men: rows.filter(row => row.gender === "Masculin").length,
  };
  return { scope, rows: filtered, counts, regionLabel };
}

/** Données de la page (liste + régions disponibles pour le filtre admin). */
export async function listSelectedAmbassadorsAction(channel: PaymentChannelFilter, regionId?: string) {
  const data = await loadRows(channel, regionId);
  if (!data) return { ok: false as const, error: "Liste indisponible : vous devez être un ambassadeur sélectionné." };
  return { ok: true as const, rows: data.rows, counts: data.counts, regionLabel: data.regionLabel };
}

/** Régions pour le filtre (admin uniquement). */
export async function getSelectedAmbassadorsContextAction() {
  const scope = await resolveScope();
  if (!scope) return null;
  const regions = scope.isAdmin
    ? await db.region.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  return { isAdmin: scope.isAdmin, regions };
}

function filenameBase(channel: PaymentChannelFilter) {
  const suffix = { ALL: "", ONLINE: "-en-ligne", POINT_FOCAL: "-point-focal" }[channel];
  return `ambassadeurs-selectionnes${suffix}`;
}

type ExportResult = { ok: true; filename: string; base64: string } | { ok: false; error: string };

export async function exportSelectedAmbassadorsExcelAction(
  channel: PaymentChannelFilter,
  regionId?: string
): Promise<ExportResult> {
  const data = await loadRows(channel, regionId);
  if (!data) return { ok: false, error: "Export indisponible." };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ambassadeurs");
  sheet.columns = [
    { header: "N°", key: "n", width: 6 },
    { header: "Nom et prénom", key: "name", width: 34 },
    { header: "Sexe", key: "gender", width: 10 },
    { header: "Téléphone", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 34 },
    { header: "Région", key: "region", width: 18 },
    { header: "Paiement", key: "channel", width: 24 },
  ];
  sheet.getRow(1).font = { bold: true };
  data.rows.forEach((row, index) =>
    sheet.addRow({
      n: index + 1,
      name: row.fullName,
      gender: row.gender,
      phone: row.phone,
      email: row.email,
      region: row.region,
      channel: CHANNEL_LABEL[row.channel],
    })
  );

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { ok: true, filename: `${filenameBase(channel)}.xlsx`, base64: buffer.toString("base64") };
}

export async function exportSelectedAmbassadorsPdfAction(
  channel: PaymentChannelFilter,
  regionId?: string
): Promise<ExportResult> {
  const data = await loadRows(channel, regionId);
  if (!data) return { ok: false, error: "Export indisponible." };

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842; // A4 paysage
  const pageHeight = 595;
  const margin = 36;
  const rowHeight = 20;
  const columns = [
    { title: "N°", x: margin, width: 30 },
    { title: "Nom et prénom", x: margin + 30, width: 230 },
    { title: "Sexe", x: margin + 260, width: 50 },
    { title: "Téléphone", x: margin + 310, width: 100 },
    { title: "Région", x: margin + 410, width: 110 },
    { title: "Paiement", x: margin + 520, width: 150 },
  ];
  const clip = (text: string, width: number, size: number, usedFont = font) => {
    let value = text;
    while (value.length > 1 && usedFont.widthOfTextAtSize(value, size) > width - 4) value = value.slice(0, -1);
    return value === text ? value : `${value.slice(0, -1)}…`;
  };
  // Helvetica standard (WinAnsi) : les caractères hors plage sont remplacés pour ne pas faire échouer le PDF.
  const safe = (text: string) => text.replace(/[^\x20-\x7E -ÿ]/g, "?");

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  const header = () => {
    page.drawText("Liste des ambassadeurs sélectionnés", {
      x: margin,
      y,
      size: 15,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 18;
    page.drawText(safe(`${data.regionLabel} - ${data.rows.length} ambassadeur(s) - ${CHANNEL_FILTER_TEXT[channel]}`), {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 22;
    page.drawRectangle({ x: margin - 4, y: y - 5, width: pageWidth - 2 * margin + 8, height: rowHeight, color: rgb(0.92, 0.92, 0.92) });
    for (const column of columns) page.drawText(column.title, { x: column.x, y, size: 10, font: bold });
    y -= rowHeight;
  };
  header();

  data.rows.forEach((row, index) => {
    if (y < margin + rowHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      header();
    }
    const cells = [
      String(index + 1),
      safe(row.fullName),
      row.gender,
      safe(row.phone),
      safe(row.region),
      CHANNEL_LABEL[row.channel],
    ];
    columns.forEach((column, i) => page.drawText(safe(clip(cells[i], column.width, 10)), { x: column.x, y, size: 10, font }));
    y -= rowHeight;
  });

  const bytes = await doc.save();
  return { ok: true, filename: `${filenameBase(channel)}.pdf`, base64: Buffer.from(bytes).toString("base64") };
}

const CHANNEL_FILTER_TEXT: Record<PaymentChannelFilter, string> = {
  ALL: "Tous les paiements",
  ONLINE: "Payés en ligne",
  POINT_FOCAL: "Payés via le point focal",
};
