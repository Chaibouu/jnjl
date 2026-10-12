import { CalendarDays, MapPin } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { PosterGenerator } from "@/components/site/PosterGenerator";
import charter from "@/settings/charter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mon affiche « J'y serai »",
  description:
    "Créez votre affiche « J'y serai » pour la 6ᵉ édition de la Journée Nationale du Jeune Leader, le 28 novembre 2026 à Niamey, et partagez-la.",
  path: "/affiche",
  image: "/affiche-jy-serai-2026.jpg",
});

export default function PosterPage() {
  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Campagne « J'y serai »"
        title="Affichez votre présence à la JNJL"
        description="Ajoutez votre photo à l'affiche officielle de la 6ᵉ édition de la Journée Nationale du Jeune Leader et partagez-la autour de vous."
        image="/entetes/galerie-3.jpg"
        tint="orange"
      >
        <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
          <CalendarDays className="h-4 w-4" style={{ color: charter.gold }} />
          28 novembre 2026
        </span>
        <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
          <MapPin className="h-4 w-4" style={{ color: charter.gold }} />
          Centre International des Conférences Mahatma Gandhi, Niamey
        </span>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        <PosterGenerator />
      </div>
    </div>
  );
}
