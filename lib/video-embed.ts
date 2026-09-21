/**
 * Transforme un lien YouTube / Vimeo en URL d'intégration (iframe).
 * Retourne null pour tout autre lien (à afficher comme simple lien).
 */
export function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const embed = parsed.pathname.match(/^\/embed\/([\w-]+)/);
      if (embed) return `https://www.youtube.com/embed/${embed[1]}`;
    }
    if (host === "youtu.be") return `https://www.youtube.com/embed${parsed.pathname}`;
    if (host === "vimeo.com") return `https://player.vimeo.com/video${parsed.pathname}`;
  } catch {
    return null;
  }
  return null;
}
