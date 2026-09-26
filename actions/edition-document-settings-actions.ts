"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
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
  await requirePermission("editions.manage");
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
  await requirePermission("editions.manage");
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
