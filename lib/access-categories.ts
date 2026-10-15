/** Catégories de badges d'accès (hors ambassadeurs). Sans dépendance serveur : utilisable côté navigateur. */
export const ACCESS_CATEGORIES = [
  { code: "MEDIA", label: "Média / Presse" },
  { code: "COMMISSION", label: "Membre de commission" },
  { code: "COMITE_ORGANISATION", label: "Comité d'organisation" },
  { code: "INTERVENANT", label: "Intervenant / Speaker" },
  { code: "POINT_FOCAL", label: "Point focal" },
  { code: "PERSONNEL_APPUI", label: "Personnel d'appui" },
  { code: "INVITE", label: "Invité / VIP" },
  { code: "AUTRE", label: "Autre" },
] as const;

export type AccessCategoryCode = (typeof ACCESS_CATEGORIES)[number]["code"];

export function isAccessCategory(value: string): value is AccessCategoryCode {
  return ACCESS_CATEGORIES.some(category => category.code === value);
}

export function categoryLabel(code: string): string {
  return ACCESS_CATEGORIES.find(category => category.code === code)?.label ?? code;
}
