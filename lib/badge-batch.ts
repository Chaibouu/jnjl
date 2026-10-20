import { generateDesignBadgesPdf, type DesignBadgeItem } from "@/lib/generate-badge-pdf";

/**
 * Nombre de badges générés par appel serveur. Le dessin d'un badge prend ~80 ms : 40 badges tiennent largement
 * dans la durée maximale d'une fonction Vercel et dans sa limite de réponse (4,5 Mo). Le navigateur enchaîne les
 * appels « part 0, 1, 2… » puis assemble un seul PDF prêt à imprimer.
 */
export const BADGES_PER_PART = 40;

export type BadgePart = {
  /** PDF de cette partie (une page par badge), en base64. */
  base64: string;
  /** Rang de cette partie (0, 1, 2…) et nombre total de parties à demander. */
  part: number;
  totalParts: number;
  /** Badges rendus dans cette partie. */
  count: number;
};

/** Rend la partie `part` (de BADGES_PER_PART badges) de la liste ordonnée `items`. */
export async function renderBadgePart(items: DesignBadgeItem[], part: number): Promise<BadgePart | null> {
  const totalParts = Math.max(1, Math.ceil(items.length / BADGES_PER_PART));
  const chunk = items.slice(part * BADGES_PER_PART, (part + 1) * BADGES_PER_PART);
  if (chunk.length === 0) return null;
  const result = await generateDesignBadgesPdf(chunk);
  if (!result) return null;
  return { base64: Buffer.from(result.pdf).toString("base64"), part, totalParts, count: result.rendered };
}
