/**
 * Recalcule le score de classement (quizScore) et l'heure de fin (quizCompletedAt) de chaque candidat à
 * partir de ses tentatives terminées, avec les règles du QCM de classement par région :
 *   - le QCM de classement de la région du candidat s'il existe (sinon le QCM national) ;
 *   - si plusieurs QCM possibles ont des tentatives, le plus récent ;
 *   - la dernière tentative terminée de ce QCM fait foi.
 *
 * Par défaut : simulation (aucune écriture). Ajouter --apply pour enregistrer.
 *   node scripts/recalcul-scores-classement.js
 *   node scripts/recalcul-scores-classement.js --apply
 *
 * Après l'application, relancer « Calculer le classement » dans Classement & Sélection pour recalculer les rangs.
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
  const quizzes = await withRetry(() =>
    db.quiz.findMany({
      where: { countsForRanking: true },
      select: { id: true, title: true, regionId: true, createdAt: true },
    })
  );
  const attempts = await withRetry(() =>
    db.quizAttempt.findMany({
      where: { status: "COMPLETED", quizId: { in: quizzes.map(quiz => quiz.id) } },
      orderBy: { submittedAt: "desc" },
      select: {
        quizId: true,
        percentage: true,
        submittedAt: true,
        ambassadorApplication: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            regionId: true,
            quizScore: true,
            quizCompletedAt: true,
            region: { select: { name: true } },
          },
        },
      },
    })
  );

  const quizById = new Map(quizzes.map(quiz => [quiz.id, quiz]));
  const byApplication = new Map();
  for (const attempt of attempts) {
    const key = attempt.ambassadorApplication.id;
    if (!byApplication.has(key)) byApplication.set(key, { application: attempt.ambassadorApplication, attempts: [] });
    byApplication.get(key).attempts.push(attempt);
  }

  let changes = 0;
  for (const { application, attempts: list } of byApplication.values()) {
    const regional = list.filter(item => quizById.get(item.quizId).regionId === application.regionId);
    const candidates = regional.length > 0 ? regional : list.filter(item => quizById.get(item.quizId).regionId === null);
    if (candidates.length === 0) continue;

    // QCM le plus récent parmi ceux de la bonne portée, puis sa dernière tentative terminée.
    const newestQuizId = candidates
      .map(item => quizById.get(item.quizId))
      .sort((a, b) => b.createdAt - a.createdAt)[0].id;
    const chosen = candidates.find(item => item.quizId === newestQuizId);

    const score = chosen.percentage ?? 0;
    const same =
      application.quizScore === score &&
      application.quizCompletedAt &&
      application.quizCompletedAt.getTime() === chosen.submittedAt.getTime();
    if (same) continue;

    changes += 1;
    console.log(
      `${application.region.name} | ${application.firstName} ${application.lastName} : ${application.quizScore} -> ${score} (${quizById.get(chosen.quizId).title})`
    );
    if (APPLY) {
      await withRetry(() =>
        db.ambassadorApplication.update({
          where: { id: application.id },
          data: { quizScore: score, quizCompletedAt: chosen.submittedAt },
        })
      );
    }
  }

  console.log(
    APPLY
      ? `\n${changes} candidat(s) mis à jour. Relancez « Calculer le classement » pour recalculer les rangs.`
      : `\n${changes} candidat(s) seraient mis à jour. Relancez avec --apply pour enregistrer.`
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error.message);
    process.exit(1);
  });
