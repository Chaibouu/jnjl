import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/** Zones privées : jamais indexées (doublé par l'en-tête X-Robots-Tag de next.config.mjs). */
const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/ambassadeur",
  "/dashboard",
  "/profile",
  "/auth/",
  "/unauthorized",
  "/uploads/",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
