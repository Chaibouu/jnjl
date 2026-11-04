import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/**
 * Chiffres publics de l'accueil : ambassadeurs sélectionnés, régions et participants inscrits (inscriptions annulées
 * exclues) de l'édition active. Mis en cache 5 minutes pour ne pas solliciter la base à chaque visite.
 */
export const getPublicCounts = unstable_cache(
  async (editionId: string) => {
    const [ambassadors, regions, participants] = await Promise.all([
      db.selection.count({
        where: { status: "SELECTIONNE", ambassadorApplication: { is: { editionId } } },
      }),
      db.region.count(),
      db.eventApplication.count({ where: { editionId, cancelledAt: null } }),
    ]);
    return { ambassadors, regions, participants };
  },
  ["public-counts"],
  { revalidate: 300 }
);
