/** Engagement à l'entrepreneuriat pris lors de la cérémonie (formulaire des participants). */
export const ENTREPRENEURSHIP_VALUES = ["OUI", "NON", "PEUT_ETRE"] as const;
export type EntrepreneurshipCommitment = (typeof ENTREPRENEURSHIP_VALUES)[number];

export const ENTREPRENEURSHIP_OPTIONS: [EntrepreneurshipCommitment, string][] = [
  ["OUI", "Oui"],
  ["NON", "Non"],
  ["PEUT_ETRE", "Peut-être"],
];

export const formatEntrepreneurship = (value: string | null | undefined) =>
  ENTREPRENEURSHIP_OPTIONS.find(([code]) => code === value)?.[1] ?? "";

/** Professions proposées dans la liste déroulante (la dernière, « Autre », couvre le reste). */
export const PROFESSIONS = [
  "Élève",
  "Étudiant(e)",
  "Enseignant(e)",
  "Agent de santé",
  "Agriculteur / Éleveur",
  "Commerçant(e)",
  "Entrepreneur(e)",
  "Artisan(e)",
  "Fonctionnaire / Agent public",
  "Employé(e) du secteur privé",
  "Ingénieur / Technicien",
  "Informaticien(ne) / Numérique",
  "Journaliste / Communication",
  "Juriste / Avocat(e)",
  "Militaire / Forces de sécurité",
  "Membre d'ONG / Association",
  "Sans emploi",
  "Autre",
] as const;
