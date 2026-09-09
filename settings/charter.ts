/**
 * Charte graphique JNJL — page principale et pages d'authentification.
 */
const charter = {
  bg: "#F9F9FB", // fond principal (off-white) — 60%
  surface: "#FFFFFF", // cartes / sections blanches
  ink: "#282828", // anthracite — textes, titres, structure — 30%
  inkSoft: "rgba(40,40,40,0.7)", // corps de texte (90% d'opacité approx.)
  inkFaint: "rgba(40,40,40,0.55)",
  orange: "#F07321", // Orange JNJL — action principale — 10%
  orangeDark: "#D6650F", // hover / dégradé
  gold: "#FFBC01", // Or Leader — accents, badges, highlights
  green: "#6D9743", // Vert Patrie — touche secondaire, réussite
  border: "#E7E7EA",
} as const;

export default charter;
