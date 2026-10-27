/**
 * Remet le nom des comptes ambassadeurs à celui de leur candidature (nom officiel des documents), pour ceux qui
 * l'ont modifié depuis la page profil.
 *
 * Par défaut : simulation (liste les comptes concernés, aucune écriture). Ajouter --apply pour enregistrer.
 *   node scripts/restaurer-noms-ambassadeurs.js
 *   node scripts/restaurer-noms-ambassadeurs.js --apply
 */
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry(task) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt === 7) throw error;
      console.log(`Base injoignable, nouvel essai (${attempt + 1})…`);
      await wait(6000);
    }
  }
}

async function main() {
  const applications = await withRetry(() =>
    db.ambassadorApplication.findMany({
      where: { userId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        user: { select: { name: true, firstName: true, lastName: true, email: true } },
      },
    })
  );

  // Une seule candidature par compte : la plus récente (liste triée du plus récent au plus ancien).
  const seen = new Set();
  const changes = [];
  for (const application of applications) {
    if (!application.user || seen.has(application.userId)) continue;
    seen.add(application.userId);
    const name = `${application.firstName} ${application.lastName}`.trim();
    const same =
      application.user.name === name &&
      application.user.firstName === application.firstName &&
      application.user.lastName === application.lastName;
    if (!same) changes.push({ userId: application.userId, name, application, before: application.user });
  }

  console.log(`${changes.length} compte(s) à remettre au nom de la candidature.`);
  for (const change of changes) {
    console.log(`- ${change.before.email} : « ${change.before.name} » → « ${change.name} »`);
  }

  if (!APPLY) {
    console.log("\nSimulation : rien n'a été modifié. Relancer avec --apply pour enregistrer.");
    return;
  }

  for (const change of changes) {
    await withRetry(() =>
      db.user.update({
        where: { id: change.userId },
        data: { name: change.name, firstName: change.application.firstName, lastName: change.application.lastName },
      })
    );
  }
  console.log(`\n${changes.length} compte(s) mis à jour.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
