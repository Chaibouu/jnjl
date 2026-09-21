/**
 * URL de base utilisée par le serveur pour appeler ses propres routes API (/api/profile, /api/auth/*…).
 *
 * Ces appels portent un en-tête `Authorization` : si l'URL déclenche une redirection
 * (http → https, barre finale « // », autre nom de domaine), le navigateur/fetch retire cet en-tête
 * et l'utilisateur est renvoyé en boucle vers la page de connexion. On normalise donc l'URL et,
 * sur Vercel, on retombe sur le domaine de production si la variable est absente ou vaut « localhost ».
 *
 * Aucun import Node : utilisable dans le middleware (Edge).
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const onVercel = !!process.env.VERCEL;
  const isLocal = !configured || /localhost|127\.0\.0\.1/.test(configured);

  let url = configured;
  if (onVercel && isLocal) {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
    if (host) url = `https://${host}`;
  }

  url = url.replace(/\/+$/, "");
  if (onVercel) url = url.replace(/^http:\/\//, "https://");
  return url;
}
