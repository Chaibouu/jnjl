import appConfig from "@/settings";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    // Fetch dynamic settings from the database if needed
    // const settings = await getSettings();

    return {
      title: {
        default: appConfig.websiteTitle || "Sahel Coders",
        template: `%s | ${appConfig.websiteTitle || "Sahel Coders"}`,
      },
      description:
        appConfig.websiteDescription ||
        "Plateforme de développement et d'apprentissage pour les développeurs du Sahel",
      keywords: [
        "développement",
        "programmation",
        "Sahel",
        "coders",
        "formation",
      ],
      authors: [{ name: "Sahel Coders Team" }],
      creator: "Sahel Coders",
      publisher: "Sahel Coders",
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL(
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ),
      alternates: {
        canonical: "/",
      },
      openGraph: {
        type: "website",
        locale: "fr_FR",
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        title: appConfig.websiteTitle || "Sahel Coders",
        description:
          appConfig.websiteDescription ||
          "Plateforme de développement et d'apprentissage",
        siteName: appConfig.appName || "Sahel Coders",
        images: appConfig.logoUrl
          ? [
              {
                url: `${process.env.NEXT_PUBLIC_APP_URL}${appConfig.logoUrl}`,
                width: 1200,
                height: 630,
                alt: "Sahel Coders Logo",
              },
            ]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title: appConfig.websiteTitle || "Sahel Coders",
        description:
          appConfig.websiteDescription ||
          "Plateforme de développement et d'apprentissage",
        images: appConfig.logoUrl
          ? [`${process.env.NEXT_PUBLIC_APP_URL}${appConfig.logoUrl}`]
          : [],
        creator: "@sahelcoders",
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
      verification: {
        google: process.env.GOOGLE_VERIFICATION,
        yandex: process.env.YANDEX_VERIFICATION,
        yahoo: process.env.YAHOO_VERIFICATION,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la génération des métadonnées:", error);

    // Retourner des métadonnées par défaut en cas d'erreur
    return {
      title: "Sahel Coders",
      description: "Plateforme de développement et d'apprentissage",
    };
  }
}
