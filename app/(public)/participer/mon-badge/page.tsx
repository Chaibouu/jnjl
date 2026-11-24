import { PageHero } from "@/components/site/PageHero";
import { MyParticipantBadge } from "@/components/participants/MyParticipantBadge";
import charter from "@/settings/charter";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mon badge de participant",
  description: "Retrouvez votre badge de participant à la JNJL, ajustez votre photo et téléchargez-le.",
  robots: { index: false, follow: true },
};

/** Page publique du badge : recherche par numéro (téléphone ou badge) et nom, aperçu, photo ajustable, téléchargement. */
export default function MonBadgePage() {
  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Participer"
        title="Mon badge de participant"
        description="Retrouvez votre badge, ajustez votre photo et téléchargez-le."
        image="/entetes/galerie-4.jpg"
        imagePosition="50% 32%"
        tint="orange"
      />
      <div className="px-4 pb-20 pt-8 sm:px-6">
        <div
          className="mx-auto max-w-md border bg-white p-6 shadow-sm sm:p-8"
          style={{ borderColor: charter.border }}
        >
          <MyParticipantBadge />
        </div>
      </div>
    </div>
  );
}
