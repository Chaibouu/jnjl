/**
 * Mises en page de l'impression en lot des badges, partagées par le serveur (taille d'impression, pour garder
 * le texte lisible) et le navigateur (imposition sur la feuille A4). Sans dépendance : importable des deux côtés.
 *
 * - « a9 »   : 9 badges (5,96 × 8,4 cm) par feuille A4 en portrait, 3 × 3, espacés pour la découpe ;
 * - « a6x4 » : 4 badges (9,7 × 13,7 cm, proportions A6) par feuille A4, 2 × 2, avec marges et espace de coupe ;
 * - « a5 »   : un badge par page, à la taille d'origine (≈ A5).
 * Les deux premières ajoutent de petits repères de coupe sur les bords de la feuille.
 */
export type BadgeLayout = "a9" | "a6x4" | "a5";

export const BADGE_LAYOUT_OPTIONS: { value: BadgeLayout; label: string }[] = [
  { value: "a9", label: "9 badges (6 × 8,4 cm) par feuille A4 (recommandé)" },
  { value: "a6x4", label: "4 badges (9,7 × 13,7 cm) par feuille A4" },
  { value: "a5", label: "1 badge A5 par page" },
];

/** Rappel affiché près des boutons d'impression : un « Ajuster à la page » fausse les dimensions des badges. */
export const BADGE_PRINT_HINT =
  "Dans la fenêtre d'impression, choisissez « Taille réelle » (100 %) et non « Ajuster à la page » : sinon les badges sont réduits.";

export function isBadgeLayout(value: unknown): value is BadgeLayout {
  return value === "a9" || value === "a6x4" || value === "a5";
}

// Formats en points PDF (1 pt = 1/72 pouce).
export const MM = 72 / 25.4;
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

/** Largeur d'une page de badge telle que générée par le serveur (maquette 908 × 1280 px, ≈ A5). */
export const BADGE_PAGE_WIDTH = 420;
const BADGE_RATIO = 1280 / 908;

// Petit badge : 59,6 × 84 mm. Badge « A6 » : 97 mm de large (au lieu de 105) pour laisser des marges que
// toutes les imprimantes savent imprimer et un espace de coupe entre les badges.
const SMALL_WIDTH = 59.6 * MM;
const MEDIUM_WIDTH = 97 * MM;

export type SheetLayout = {
  sheetW: number;
  sheetH: number;
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  gapX: number;
  gapY: number;
};

/** Feuille A4 découpée en cases : taille d'une case, grille et espacement entre les cases (la grille est centrée). */
export const SHEETS: Record<Exclude<BadgeLayout, "a5">, SheetLayout> = {
  // 4 mm entre les colonnes, 6 mm entre les lignes : marges d'environ 6 mm à gauche/droite et 9 mm en haut/bas.
  a6x4: {
    sheetW: A4_WIDTH,
    sheetH: A4_HEIGHT,
    cellW: MEDIUM_WIDTH,
    cellH: MEDIUM_WIDTH * BADGE_RATIO,
    cols: 2,
    rows: 2,
    gapX: 4 * MM,
    gapY: 6 * MM,
  },
  // 3 mm entre les colonnes et 10 mm entre les lignes : de quoi découper aux ciseaux ou au massicot.
  a9: {
    sheetW: A4_WIDTH,
    sheetH: A4_HEIGHT,
    cellW: SMALL_WIDTH,
    cellH: SMALL_WIDTH * BADGE_RATIO,
    cols: 3,
    rows: 3,
    gapX: 3 * MM,
    gapY: 10 * MM,
  },
};

/**
 * Rapport entre la taille imprimée d'un badge et sa page générée (1 pour l'A5). Le serveur s'en sert pour
 * agrandir le texte qui deviendrait illisible une fois le badge réduit (nom, matricule…).
 */
export function badgePrintScale(layout: BadgeLayout | null | undefined): number {
  if (!layout || layout === "a5") return 1;
  return SHEETS[layout].cellW / BADGE_PAGE_WIDTH;
}
