import { IdCard } from "lucide-react";
import { db } from "@/lib/db";
import { PageHero } from "@/components/site/PageHero";
import { ParticipantBadgeDownloadButton } from "@/components/participants/ParticipantBadgeDownloadButton";
import charter from "@/settings/charter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon badge de participant", robots: { index: false, follow: false } };

/** Page du badge participant, ouverte depuis l'e-mail de confirmation (le lien contient l'identifiant non devinable). */
export default async function ParticipantBadgePage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const application = await db.eventApplication
    .findUnique({
      where: { id: applicationId },
      select: { firstName: true, lastName: true, participation: { select: { badgeNumber: true } } },
    })
    .catch(() => null);

  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Participer"
        title="Mon badge de participant"
        description="Téléchargez votre badge et présentez-le à l'accueil de l'événement."
        image="/entetes/galerie-4.jpg"
        imagePosition="50% 32%"
        tint="orange"
      />
      <div className="px-4 pb-20 pt-8 sm:px-6">
        <div
          className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border bg-white p-8 text-center shadow-sm"
          style={{ borderColor: charter.border }}
        >
          <IdCard className="h-10 w-10" style={{ color: charter.orange }} />
          {application?.participation?.badgeNumber ? (
            <>
              <h2 className="text-lg font-bold" style={{ color: charter.ink }}>
                {application.firstName} {application.lastName}
              </h2>
              <p className="text-sm" style={{ color: charter.inkSoft }}>
                Numéro de badge : <strong>{application.participation.badgeNumber}</strong>
              </p>
              <ParticipantBadgeDownloadButton applicationId={applicationId} />
            </>
          ) : (
            <p className="text-sm" style={{ color: charter.inkSoft }}>
              Ce lien n&apos;est pas valide. Retrouvez votre badge depuis la page « Participer ».
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
