"use server";

import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/actions/requirePermission";
import { loadRegionTravelDates, parseTravelDate, saveRegionTravelDates } from "@/lib/region-travel-dates";
import {
  editionDocumentSettingsSchema,
  type EditionDocumentSettingsInput,
} from "@/schemas/edition-document-settings";

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

function toDateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** Réglages de génération de documents (dates ordre de mission/absence, clause de patronage) d'une édition. */
export async function getEditionDocumentSettingsAction(editionId: string) {
  await requireSuperAdmin();
  const edition = await db.edition.findFirst({
    where: { id: editionId, isDeleted: false },
    select: {
      missionDepartureDate: true,
      missionReturnDate: true,
      absenceStartDate: true,
      absenceEndDate: true,
      patronageText: true,
      attestationTheme: true,
      attestationLocation: true,
      attestationStartDate: true,
      attestationEndDate: true,
      attestationEditionLabel: true,
    },
  });
  if (!edition) throw new Error("Édition introuvable");

  return {
    missionDepartureDate: toDateInputValue(edition.missionDepartureDate),
    missionReturnDate: toDateInputValue(edition.missionReturnDate),
    absenceStartDate: toDateInputValue(edition.absenceStartDate),
    absenceEndDate: toDateInputValue(edition.absenceEndDate),
    patronageText: edition.patronageText ?? "",
    attestationTheme: edition.attestationTheme ?? "",
    attestationLocation: edition.attestationLocation ?? "",
    attestationStartDate: toDateInputValue(edition.attestationStartDate),
    attestationEndDate: toDateInputValue(edition.attestationEndDate),
    attestationEditionLabel: edition.attestationEditionLabel ?? "",
  };
}

export async function updateEditionDocumentSettingsAction(
  editionId: string,
  input: EditionDocumentSettingsInput
) {
  await requireSuperAdmin();
  const data = editionDocumentSettingsSchema.parse(input);

  const existing = await db.edition.findFirst({ where: { id: editionId, isDeleted: false } });
  if (!existing) throw new Error("Édition introuvable");

  await db.edition.update({
    where: { id: editionId },
    data: {
      missionDepartureDate: toDate(data.missionDepartureDate),
      missionReturnDate: toDate(data.missionReturnDate),
      absenceStartDate: toDate(data.absenceStartDate),
      absenceEndDate: toDate(data.absenceEndDate),
      patronageText: emptyToNull(data.patronageText),
      attestationTheme: emptyToNull(data.attestationTheme),
      attestationLocation: emptyToNull(data.attestationLocation),
      attestationStartDate: toDate(data.attestationStartDate),
      attestationEndDate: toDate(data.attestationEndDate),
      attestationEditionLabel: emptyToNull(data.attestationEditionLabel),
    },
  });

  return { success: true };
}

/** Dates de départ / retour de chaque région pour l'édition (vides = dates générales). */
export async function getRegionTravelDatesAction(editionId: string) {
  await requireSuperAdmin();
  const [regions, dates] = await Promise.all([
    db.region.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    loadRegionTravelDates(editionId),
  ]);
  return regions.map(region => ({
    regionId: region.id,
    name: region.name,
    departure: dates[region.id]?.departure ?? "",
    return: dates[region.id]?.return ?? "",
  }));
}

export async function updateRegionTravelDatesAction(
  editionId: string,
  rows: { regionId: string; departure: string; return: string }[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSuperAdmin();
  const edition = await db.edition.findFirst({ where: { id: editionId, isDeleted: false }, select: { id: true } });
  if (!edition) return { ok: false, error: "Édition introuvable" };

  const regions = new Set((await db.region.findMany({ select: { id: true } })).map(region => region.id));
  const dates: Record<string, { departure?: string; return?: string }> = {};
  for (const row of rows) {
    if (!regions.has(row.regionId)) continue;
    const departure = parseTravelDate(row.departure) ? row.departure : "";
    const returnDate = parseTravelDate(row.return) ? row.return : "";
    if (row.departure && !departure) return { ok: false, error: "Date de départ invalide" };
    if (row.return && !returnDate) return { ok: false, error: "Date de retour invalide" };
    if (departure && returnDate && returnDate < departure) {
      return { ok: false, error: "La date de retour doit être après la date de départ" };
    }
    if (departure || returnDate) dates[row.regionId] = { departure, return: returnDate };
  }
  await saveRegionTravelDates(editionId, dates);
  return { ok: true };
}
