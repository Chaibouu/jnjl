/**
 * Organisation des dossiers dans le stockage (Cloudflare R2 en production, `public/uploads/` en local).
 *
 *   users/{userId}/avatar/…            avatars téléversés par les utilisateurs
 *   editions/{année}/engagements/…     fiches d'engagement signées (PDF)
 *   editions/{année}/documents/…       demande de permission, ordre de mission (PDF)
 *   editions/{année}/certificates/…    attestations de participation (PDF)
 *   editions/{année}/training-certificates/…   attestations de formation (PDF)
 *   content/editor/{année}/…           images insérées dans les contenus riches
 *   content/partners/logos/…           logos des partenaires
 *   content/news/{année}/…             images de couverture des actualités
 *   content/speakers/photos/…          photos des intervenants
 *   content/gallery/{année}/…          photos de la galerie d'une édition
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
  partnerLogo: () => "content/partners/logos",
  newsCover: () => `content/news/${new Date().getFullYear()}`,
  speakerPhoto: () => "content/speakers/photos",
  gallery: (editionYear: number) => `content/gallery/${editionYear}`,
  misc: () => "misc",
} as const;
