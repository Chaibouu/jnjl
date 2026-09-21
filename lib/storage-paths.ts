/**
 * Organisation des dossiers dans le stockage (Cloudflare R2 en production, `public/uploads/` en local).
 *
 *   users/{userId}/avatar/…            avatars téléversés par les utilisateurs
 *   editions/{année}/engagements/…     fiches d'engagement signées (PDF)
 *   editions/{année}/documents/…       demande de permission, ordre de mission (PDF)
 *   editions/{année}/certificates/…    attestations de participation (PDF)
 *   editions/{année}/training-certificates/…   attestations de formation (PDF)
 *   content/editor/{année}/…           images insérées dans les contenus riches
 *   misc/…                             autres fichiers
 *
 * Regrouper par édition permet d'archiver ou de purger une édition entière, et de
 * retrouver un fichier sans avoir à interroger la base de données.
 */
export const storagePaths = {
  avatar: (userId: string) => `users/${userId}/avatar`,
  engagement: (editionYear: number) => `editions/${editionYear}/engagements`,
  document: (editionYear: number) => `editions/${editionYear}/documents`,
  certificate: (editionYear: number) => `editions/${editionYear}/certificates`,
  trainingCertificate: (editionYear: number) => `editions/${editionYear}/training-certificates`,
  editorImage: () => `content/editor/${new Date().getFullYear()}`,
  misc: () => "misc",
} as const;
