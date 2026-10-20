import { db } from "@/lib/db";

/**
 * Règles du QCM de classement par région.
 *
 * - Un QCM peut être réservé à une région (`regionId`) ; sans région, il est national.
 * - Il ne peut y avoir qu'un seul QCM de classement publié par région : deux QCM nationaux, ou deux QCM
 *   d'une même région, se télescoperaient (le score du second écraserait celui du premier).
 * - Pour une région qui a son propre QCM de classement publié, celui-ci remplace le QCM national.
 */

/** QCM de classement déjà publié dans la même édition et la même région (ou national), hors `excludeId`. */
export async function findRankingConflict(params: {
  editionId: string;
  regionId: string | null;
  excludeId?: string;
}): Promise<{ id: string; title: string } | null> {
  return db.quiz.findFirst({
    where: {
      editionId: params.editionId,
      countsForRanking: true,
      status: "PUBLISHED",
      regionId: params.regionId,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
    select: { id: true, title: true },
  });
}

/** Message d'erreur affiché à l'administrateur quand un second QCM de classement serait publié. */
export async function describeRankingConflict(params: {
  editionId: string;
  regionId: string | null;
  excludeId?: string;
}): Promise<string | null> {
  const conflict = await findRankingConflict(params);
  if (!conflict) return null;
  const where = params.regionId
    ? `dans cette région`
    : `au niveau national`;
  return `Un autre QCM de classement est déjà publié ${where} : « ${conflict.title} ». Archivez-le d'abord, sinon les scores des candidats s'écraseraient.`;
}

/**
 * QCM de classement qui compte pour une région : celui de la région s'il est publié, sinon le national.
 * `null` si aucun QCM de classement n'est publié.
 */
export async function getEffectiveRankingQuizId(editionId: string, regionId: string): Promise<string | null> {
  const quizzes = await db.quiz.findMany({
    where: {
      editionId,
      countsForRanking: true,
      status: "PUBLISHED",
      OR: [{ regionId }, { regionId: null }],
    },
    select: { id: true, regionId: true },
  });
  return (quizzes.find(quiz => quiz.regionId === regionId) ?? quizzes[0])?.id ?? null;
}
