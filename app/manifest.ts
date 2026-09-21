import type { MetadataRoute } from "next";
import appConfig from "@/settings";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Journée Nationale du Jeune Leader",
    short_name: "JNJL",
    description: appConfig.websiteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#F9F9FB",
    theme_color: appConfig.primaryColor,
    lang: "fr",
    icons: [{ src: appConfig.logoUrl, sizes: "1280x1280", type: "image/jpeg" }],
  };
}
