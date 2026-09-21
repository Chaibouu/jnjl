/**
 * Avatars prédéfinis proposés aux utilisateurs (fichiers de `public/avatar/`).
 * La liste sert à la fois à l'affichage du sélecteur et à la validation côté serveur :
 * seule une valeur de cette liste peut être enregistrée comme avatar prédéfini.
 */
export const DEFAULT_AVATAR = "/avatar/default-avatar.jpg";

const PRESET_FILES = [
  "avatar-1.svg",
  "avatar-2.svg",
  "avatar-3.svg",
  "avatar-4.svg",
  "avatar-5.svg",
  "avatar-6.svg",
  "man.png",
  "woman.png",
  "woman1.png",
  "woman2.png",
  "user.png",
  "bear.png",
  "chicken.png",
  "dog.png",
  "meerkat.png",
  "rabbit.png",
] as const;

export const PRESET_AVATARS: readonly string[] = PRESET_FILES.map(file => `/avatar/${file}`);

export function isPresetAvatar(value: string): boolean {
  return PRESET_AVATARS.includes(value);
}

/** Contraintes du téléversement d'une photo personnelle. */
export const AVATAR_UPLOAD = {
  /** Taille maximale du fichier reçu par le serveur (après réduction côté navigateur). */
  maxBytes: 3 * 1024 * 1024,
  /** Côté du carré final enregistré. */
  outputSize: 512,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"] as readonly string[],
} as const;
