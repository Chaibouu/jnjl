/**
 * Clé de comparaison d'un numéro de téléphone : ses 8 derniers chiffres (numéro nigérien sans indicatif).
 * « +227 96 12 34 56 », « 00227 96123456 » et « 96-12-34-56 » donnent la même clé. Null si moins de 8 chiffres.
 */
export function phoneKey(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : null;
}

/** Nom comparable : sans accents, sans casse, espaces et tirets unifiés. */
export function nameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
