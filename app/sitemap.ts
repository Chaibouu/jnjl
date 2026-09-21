import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

// Généré à la demande (et non au build) : le contenu vient de la base de données.
export const dynamic = "force-dynamic";

const STATIC_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/actualites", priority: 0.9, changeFrequency: "daily" },
  { path: "/programme", priority: 0.8, changeFrequency: "weekly" },
  { path: "/participer", priority: 0.8, changeFrequency: "weekly" },
  { path: "/ambassadeurs/candidature", priority: 0.8, changeFrequency: "weekly" },
  { path: "/intervenants", priority: 0.7, changeFrequency: "weekly" },
  { path: "/partenaires", priority: 0.6, changeFrequency: "monthly" },
  { path: "/editions", priority: 0.7, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map(page => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const [news, editions] = await Promise.all([
      db.news.findMany({
        where: { isDeleted: false, isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: "desc" },
      }),
      db.edition.findMany({
        where: { isDeleted: false, status: "ARCHIVED" },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const item of news) {
      entries.push({
        url: absoluteUrl(`/actualites/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
    for (const item of editions) {
      entries.push({
        url: absoluteUrl(`/editions/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "yearly",
        priority: 0.6,
      });
    }
  } catch (error) {
    // Base indisponible : on sert au moins les pages statiques plutôt qu'une erreur.
    console.error("Sitemap : contenu dynamique indisponible", error);
  }

  return entries;
}
