import { db } from "@/lib/db";

/**
 * Dates de départ / retour par région (la distance du voyage diffère d'une région à l'autre). Elles remplacent, pour
 * les ambassadeurs de la région, les dates générales de l'ordre de mission ET de l'autorisation d'absence.
 * Stockées en JSON dans les réglages : { [regionId]: { departure: "yyyy-mm-dd", return: "yyyy-mm-dd" } }.
 * Une date vide retombe sur le réglage général de l'édition.
 */
export type RegionTravelDates = Record<string, { departure?: string; return?: string }>;

const key = (editionId: string) => `documents.region_travel_dates.${editionId}`;

export async function loadRegionTravelDates(editionId: string): Promise<RegionTravelDates> {
  const setting = await db.setting.findUnique({ where: { key: key(editionId) }, select: { value: true } });
  if (!setting) return {};
  try {
    const parsed = JSON.parse(setting.value);
    return parsed && typeof parsed === "object" ? (parsed as RegionTravelDates) : {};
  } catch {
    return {};
  }
}

export async function saveRegionTravelDates(editionId: string, dates: RegionTravelDates) {
  const value = JSON.stringify(dates);
  await db.setting.upsert({
    where: { key: key(editionId) },
    update: { value },
    create: {
      key: key(editionId),
      value,
      description: "Dates de départ et de retour par région (ordre de mission, autorisation d'absence)",
      isCustomizable: false,
    },
  });
}

/** "yyyy-mm-dd" valide → Date, sinon null. */
export function parseTravelDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
