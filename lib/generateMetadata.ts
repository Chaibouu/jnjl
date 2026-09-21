import appConfig from "@/settings";
import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_LONG_NAME,
  SITE_NAME,
  getSiteUrl,
} from "@/lib/seo";

/**
 * Métadonnées par défaut de tout le site. Chaque page publique les complète avec `buildMetadata()`
 * (titre, description et URL canonique propres) : on ne définit donc PAS de canonical ici,
 * sinon toutes les pages se déclareraient doublon de l'accueil.
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const title = `${SITE_NAME} — ${SITE_LONG_NAME} au Niger`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description: appConfig.websiteDescription,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    authors: [{ name: SITE_NAME, url: siteUrl }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "jeunesse",
    formatDetection: { email: false, address: false, telephone: false },
    openGraph: {
      type: "website",
      locale: SITE_LOCALE,
      url: siteUrl,
      siteName: SITE_NAME,
      title,
      description: appConfig.websiteDescription,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_LONG_NAME}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: appConfig.websiteDescription,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    // Renseignez GOOGLE_VERIFICATION / BING_VERIFICATION dans Vercel pour valider la propriété du site.
    verification: {
      google: process.env.GOOGLE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      other: process.env.BING_VERIFICATION ? { "msvalidate.01": process.env.BING_VERIFICATION } : undefined,
    },
  };
}
