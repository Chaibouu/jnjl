/**
 * Rattrapage des inscriptions de participants créées avant les clés « actives » (activeEmail, phoneKey) :
 * renseigne l'e-mail actif (en minuscules) et la clé du téléphone (8 derniers chiffres) des inscriptions non annulées.
 * Sans cela, un doublon d'e-mail ou de numéro ne serait pas arrêté par la base pour ces anciennes inscriptions.
 *
 * Par défaut : simulation (aucune écriture). Ajouter --apply pour enregistrer.
 *   node scripts/rattrapage-participants.js
 *   node scripts/rattrapage-participants.js --apply
 *
 * À lancer APRÈS `npm run db:push`. Si deux inscriptions actives partagent le même e-mail ou numéro, elles sont listées
 * et laissées de côté (à traiter à la main : annuler le doublon dans l'administration, puis relancer).
 */
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const phoneKey = phone => {
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : null;
};

async function main() {
  const applications = await db.eventApplication.findMany({
    where: { cancelledAt: null },
    select: { id: true, editionId: true, email: true, phone: true, activeEmail: true, phoneKey: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const seenEmail = new Set();
  const seenPhone = new Set();
  const updates = [];
  const conflicts = [];

  for (const application of applications) {
    const email = application.email.toLowerCase();
    const key = phoneKey(application.phone);
    const emailSlot = `${application.editionId}|${email}`;
    const phoneSlot = key ? `${application.editionId}|${key}` : null;

    if (seenEmail.has(emailSlot) || (phoneSlot && seenPhone.has(phoneSlot))) {
      conflicts.push(application);
      continue;
    }
    seenEmail.add(emailSlot);
    if (phoneSlot) seenPhone.add(phoneSlot);

    if (application.activeEmail !== email || application.phoneKey !== key) {
      updates.push({ id: application.id, email, key });
    }
  }

  console.log(`${applications.length} inscription(s) active(s), ${updates.length} à mettre à jour.`);
  if (conflicts.length) {
    console.log(`\n${conflicts.length} doublon(s) à traiter à la main (même e-mail ou même numéro) :`);
    for (const conflict of conflicts) console.log(`- ${conflict.email} / ${conflict.phone} (${conflict.id})`);
  }

  if (!APPLY) {
    console.log("\nSimulation : rien n'a été modifié. Relancer avec --apply pour enregistrer.");
    return;
  }
  for (const update of updates) {
    await db.eventApplication.update({ where: { id: update.id }, data: { activeEmail: update.email, phoneKey: update.key } });
  }
  console.log(`\n${updates.length} inscription(s) mise(s) à jour.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
