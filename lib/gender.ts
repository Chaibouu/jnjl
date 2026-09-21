/** Sexe : uniquement Masculin ou Féminin, partout dans le projet. */
export const GENDER_VALUES = ["MASCULIN", "FEMININ"] as const;

export type Gender = (typeof GENDER_VALUES)[number];

export const GENDER_OPTIONS: ReadonlyArray<readonly [Gender, string]> = [
  ["MASCULIN", "Masculin"],
  ["FEMININ", "Féminin"],
];

/** Libellé affichable d'un sexe enregistré (« — » si non renseigné). */
export function formatGender(value?: string | null): string {
  return GENDER_OPTIONS.find(([code]) => code === value)?.[1] ?? "—";
}
