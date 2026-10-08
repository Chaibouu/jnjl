/**
 * Mise en forme de la fiche d'engagement (nouveau format officiel JNJL 6) à partir du texte saisi
 * par l'administration. Sans dépendance : utilisé par l'aperçu (navigateur) et par le PDF (serveur).
 *
 * Structure reconnue :
 *  - 1re ligne : titre (« FORMULE D'ENGAGEMENT »)
 *  - « Moi, … »            : formule d'ouverture, centrée
 *  - « Vu … » / « Convaincu(e) … » : considérants
 *  - « Je m'engage … »     : introduction des engagements
 *  - lignes suivantes      : engagements (puces)
 *  - « SIGNATURE » final   : ignoré (le bloc de signature est généré par la plateforme)
 * Un texte qui ne suit pas cette structure (ancien format) reste affiché en paragraphes simples.
 */

export type EngagementBlockKind = "title" | "intro" | "recital" | "pledgeHeading" | "pledge" | "plain" | "spacer";

export type EngagementBlock = { kind: EngagementBlockKind; text: string };

export const ENGAGEMENT_COLORS = {
  title: "#2F5496",
  accent: "#FFC000",
} as const;

const APOSTROPHE = /[’']/;

export function parseEngagementText(text: string): EngagementBlock[] {
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const blocks: EngagementBlock[] = [];
  let seenTitle = false;
  let inPledges = false;

  for (const line of lines) {
    if (line === "") {
      if (blocks.length > 0 && blocks[blocks.length - 1].kind !== "spacer") {
        blocks.push({ kind: "spacer", text: "" });
      }
      continue;
    }
    if (/^signature$/i.test(line)) continue;

    if (!seenTitle) {
      seenTitle = true;
      blocks.push({ kind: "title", text: line });
    } else if (/^moi,/i.test(line)) {
      blocks.push({ kind: "intro", text: line.replace(/\s{2,}/g, " ") });
    } else if (/^(vu|convaincu)/i.test(line)) {
      blocks.push({ kind: "recital", text: line.replace(/\s{2,}/g, " ") });
    } else if (new RegExp(`^je m${APOSTROPHE.source}engage`, "i").test(line)) {
      inPledges = true;
      blocks.push({ kind: "pledgeHeading", text: line });
    } else if (inPledges) {
      blocks.push({ kind: "pledge", text: line });
    } else {
      blocks.push({ kind: "plain", text: line });
    }
  }

  while (blocks.length > 0 && blocks[blocks.length - 1].kind === "spacer") blocks.pop();
  // Les espaces entre engagements ne servent à rien : chaque puce a déjà son interligne.
  return blocks.filter((block, index) => !(block.kind === "spacer" && blocks[index - 1]?.kind === "pledge"));
}

/** Texte officiel de la formule d'engagement (6ème édition) — proposé à l'administration. */
export const OFFICIAL_ENGAGEMENT_TEXT = `FORMULE D’ENGAGEMENT

Moi, Jeune Leader du Niger,
Vu la réalité du marché de l’emploi caractérisé par un taux élevé de chômage ;
Vu que la fonction publique ne peut employer tous les demandeurs d’emploi ;
Vu que les entreprises, tant publiques que privées, ne peuvent, en se joignant à l’Etat, satisfaire les demandes d’emploi ;
Vu l’environnement économique qui réclame la contribution de tout Nigérien à la croissance économique du pays ;
Convaincu(e) que l’entreprenariat est une meilleure alternative à la relance de cette croissance économique ;

Je m’engage solennellement à :
Appliquer tout ce que j’ai appris dans mes activités quotidiennes ;
Transmettre tout ce que j’ai appris à mon entourage en incarnant le changement ;
Mobiliser les autres jeunes pour le développement économique du Niger en renforçant leur leadership ;
Etre un apporteur de valeur ajoutée et non une contrainte pour ma communauté ;
Etre bâtisseur de la patrie en empruntant le chemin de l’entrepreneuriat.`;
