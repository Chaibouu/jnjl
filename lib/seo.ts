import type { Metadata } from "next";
import { getAppUrl } from "@/lib/app-url";
import appConfig from "@/settings";

/**
 * Référencement (SEO) : URL du site, métadonnées par page et données structurées (JSON-LD).
 * Aucun import Node : utilisable partout (pages, sitemap, robots).
 */

export const SITE_NAME = "JNJL";
export const SITE_LONG_NAME = "Journée Nationale du Jeune Leader";
export const SITE_LOCALE = "fr_FR";
/** Image de partage par défaut (1200×630) — public/og-image.jpg. */
export const DEFAULT_OG_IMAGE = "/og-image.jpg";

/** Mots-clés de l'organisation, utiles aux moteurs qui les lisent encore (Bing, Yandex). */
export const SITE_KEYWORDS = [
  "JNJL",
  "Journée Nationale du Jeune Leader",
  "jeune leader Niger",
  "jeunesse nigérienne",
  "leadership des jeunes",
  "ambassadeur JNJL",
  "événement jeunesse Niger",
  "Niamey",
  "engagement citoyen",
  "patriotisme",
];

export function getSiteUrl(): string {
  return getAppUrl() || "http://localhost:3000";
}

/** URL absolue à partir d'un chemin (« /actualites » → https://…/actualites) ou d'une URL déjà absolue. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Coupe un texte à la taille d'une meta description (≈ 155 caractères) sans couper un mot. */
export function toDescription(text: string | null | undefined, fallback = appConfig.websiteDescription): string {
  const clean = (text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return fallback;
  if (clean.length <= 155) return clean;
  const cut = clean.slice(0, 155);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 100))}…`;
}

type PageMetadataInput = {
  title: string;
  description?: string | null;
  /** Chemin canonique de la page, ex. « /actualites/mon-article ». */
  path: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  noindex?: boolean;
  keywords?: string[];
};

/** Métadonnées complètes d'une page : titre, description, canonical, Open Graph, Twitter. */
export function buildMetadata(input: PageMetadataInput): Metadata {
  const description = toDescription(input.description);
  const image = absoluteUrl(input.image || DEFAULT_OG_IMAGE);
  const url = absoluteUrl(input.path);
  const iso = (value?: Date | string | null) =>
    value ? new Date(value).toISOString() : undefined;

  return {
    title: input.title,
    description,
    keywords: input.keywords,
    alternates: { canonical: url },
    robots: input.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: input.type ?? "website",
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      url,
      title: input.title,
      description,
      images: [{ url: image, alt: input.title }],
      ...(input.type === "article"
        ? { publishedTime: iso(input.publishedTime), modifiedTime: iso(input.modifiedTime) }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [image],
    },
  };
}

// ─── Données structurées (schema.org) ────────────────────────────────────────

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${getSiteUrl()}/#organization`,
    name: SITE_NAME,
    alternateName: SITE_LONG_NAME,
    url: getSiteUrl(),
    logo: absoluteUrl(appConfig.logoUrl),
    description: appConfig.websiteDescription,
    email: "contact@jnjl.ne",
    areaServed: { "@type": "Country", name: "Niger" },
    address: { "@type": "PostalAddress", addressLocality: "Niamey", addressCountry: "NE" },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${getSiteUrl()}/#website`,
    url: getSiteUrl(),
    name: SITE_NAME,
    description: appConfig.websiteDescription,
    inLanguage: "fr",
    publisher: { "@id": `${getSiteUrl()}/#organization` },
  };
}

export function eventJsonLd(edition: {
  name: string;
  description?: string | null;
  theme?: string | null;
  location?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  path: string;
  image?: string | null;
  past?: boolean;
}) {
  const iso = (value?: Date | string | null) => (value ? new Date(value).toISOString() : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: edition.name,
    description: toDescription(edition.description ?? edition.theme),
    url: absoluteUrl(edition.path),
    image: [absoluteUrl(edition.image || DEFAULT_OG_IMAGE)],
    startDate: iso(edition.startDate),
    endDate: iso(edition.endDate),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: edition.location || "Niamey",
      address: { "@type": "PostalAddress", addressLocality: edition.location || "Niamey", addressCountry: "NE" },
    },
    organizer: { "@id": `${getSiteUrl()}/#organization` },
    inLanguage: "fr",
  };
}

export function articleJsonLd(article: {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
}) {
  const iso = (value?: Date | string | null) => (value ? new Date(value).toISOString() : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title.slice(0, 110),
    description: toDescription(article.description),
    mainEntityOfPage: absoluteUrl(article.path),
    image: [absoluteUrl(article.image || DEFAULT_OG_IMAGE)],
    datePublished: iso(article.publishedAt),
    dateModified: iso(article.updatedAt ?? article.publishedAt),
    inLanguage: "fr",
    author: { "@id": `${getSiteUrl()}/#organization` },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl(appConfig.logoUrl) },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
