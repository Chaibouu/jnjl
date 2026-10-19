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

/**
 * Précision demandée pour chaque catégorie : elle est affichée sur le badge (bandeau). Obligatoire quand le
 * badge ne veut rien dire sans elle (quel média ? quelle commission ? quelle région ?).
 */
export const ORGANIZATION_FIELD: Record<AccessCategoryCode, { label: string; placeholder: string; required: boolean }> = {
  MEDIA: { label: "Nom du média", placeholder: "Ex. Télé Sahel", required: true },
  COMMISSION: { label: "Nom de la commission", placeholder: "Ex. Accueil & Hébergement", required: true },
  COMITE_ORGANISATION: { label: "Service / sous-comité", placeholder: "Ex. Secrétariat", required: true },
  INTERVENANT: { label: "Structure (facultatif)", placeholder: "Ex. Université Abdou Moumouni", required: false },
  POINT_FOCAL: { label: "Région", placeholder: "Ex. Niamey", required: true },
  PERSONNEL_APPUI: { label: "Service", placeholder: "Ex. Logistique", required: true },
  INVITE: { label: "Structure (facultatif)", placeholder: "Ex. Ministère de la Jeunesse", required: false },
  AUTRE: { label: "Précision (facultatif)", placeholder: "Ex. Partenaire technique", required: false },
};

export function organizationField(category: string) {
  return isAccessCategory(category) ? ORGANIZATION_FIELD[category] : ORGANIZATION_FIELD.AUTRE;
}
