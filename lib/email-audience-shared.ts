/**
 * Éléments partagés entre l'écran d'envoi groupé et le serveur. Aucun accès à la base de données ici :
 * ce fichier est embarqué côté navigateur.
 */

/** Groupes de destinataires proposés au Super Admin pour un envoi groupé. */
export type Audience = "PENDING" | "ACCEPTED" | "REJECTED" | "USERS" | "PARTICIPANTS" | "EVERYONE" | "MANUAL";

export const AUDIENCES: { code: Audience; label: string; description: string }[] = [
  {
    code: "PENDING",
    label: "Candidats en attente",
    description: "Candidatures ambassadeurs soumises, en analyse ou en liste d'attente (édition active).",
  },
  {
    code: "ACCEPTED",
    label: "Candidats acceptés",
    description: "Ambassadeurs dont la candidature a été acceptée (édition active).",
  },
  {
    code: "REJECTED",
    label: "Candidats non retenus",
    description: "Candidatures ambassadeurs refusées (édition active).",
  },
  {
    code: "PARTICIPANTS",
    label: "Participants à l'événement",
    description: "Personnes inscrites pour participer à l'événement (édition active).",
  },
  {
    code: "USERS",
    label: "Tous les utilisateurs",
    description: "Tous les comptes actifs de la plateforme.",
  },
  {
    code: "EVERYONE",
    label: "Tout le monde",
    description: "Tous les groupes ci-dessus réunis, chaque adresse une seule fois.",
  },
  {
    code: "MANUAL",
    label: "Adresses saisies à la main",
    description: "Aucun groupe : seulement les adresses que vous saisissez ci-dessous.",
  },
];

export type Recipient = { email: string; name: string | null };

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lit une liste d'adresses saisie à la main : séparées par des virgules, points-virgules, espaces ou retours à la
 * ligne. Les adresses valides sont dédoublonnées ; les autres sont renvoyées pour pouvoir être signalées.
 */
export function parseEmailList(text: string): { valid: string[]; invalid: string[] } {
  const valid = new Set<string>();
  const invalid: string[] = [];
  // « Jean Dupont <jean@domaine.com> » (copié depuis un carnet d'adresses) : on ne garde que l'adresse entre chevrons.
  const cleaned = text.replace(/(?<![^\s,;])(?:[^\s@<>,;]+\s+)*<([^<>\s]+)>/g, " $1 ");
  for (const raw of cleaned.split(/[\s,;]+/)) {
    // Copier-coller depuis un carnet d'adresses : « Nom <adresse@domaine> » ou « "adresse@domaine" ».
    const token = raw.replace(/^[<"'(]+|[>"'),.]+$/g, "").trim();
    if (!token) continue;
    if (EMAIL_PATTERN.test(token)) valid.add(token.toLowerCase());
    else if (!invalid.includes(raw)) invalid.push(raw);
  }
  return { valid: [...valid], invalid };
}
