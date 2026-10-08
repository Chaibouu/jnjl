import { randomInt } from "crypto";

// Sans caractères ambigus (0/O, 1/l/I) : le mot de passe est recopié depuis un email.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Mot de passe provisoire aléatoire (tirage cryptographique), à communiquer une seule fois par email. */
export function generateTemporaryPassword(length = 12): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
