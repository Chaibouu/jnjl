/**
 * Enregistre les dates de départ / retour par région de l'édition active :
 * Agadez et Diffa partent le 25/11/2026, les autres régions le 26/11/2026, retour le 29/11/2026 pour toutes.
 *   node scripts/dates-voyage-regions.js
 */
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const EARLY = ["agadez", "diffa"];
const DEPARTURE_EARLY = "2026-11-25";
const DEPARTURE_OTHERS = "2026-11-26";
const RETURN = "2026-11-29";

async function main() {
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) throw new Error("Aucune édition active");
  const regions = await db.region.findMany({ orderBy: { name: "asc" } });

  const dates = {};
  for (const region of regions) {
    const early = EARLY.includes(region.name.trim().toLowerCase());
    dates[region.id] = { departure: early ? DEPARTURE_EARLY : DEPARTURE_OTHERS, return: RETURN };
    console.log(`${region.name.padEnd(12)} départ ${dates[region.id].departure}  retour ${RETURN}`);
  }
  if (!regions.some(region => EARLY.includes(region.name.trim().toLowerCase()))) {
    throw new Error("Agadez / Diffa introuvables parmi les régions : abandon");
  }

  const key = `documents.region_travel_dates.${edition.id}`;
  const value = JSON.stringify(dates);
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: {
      key,
      value,
      description: "Dates de départ et de retour par région (ordre de mission, autorisation d'absence)",
      isCustomizable: false,
    },
  });
  console.log(`\nEnregistré pour l'édition « ${edition.name} » (${edition.year}).`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
