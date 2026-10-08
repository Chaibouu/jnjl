import Image from "next/image";
import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ClosedNotice } from "@/components/site/ClosedNotice";
import { PageHero } from "@/components/site/PageHero";
import { getRegistrationState } from "@/lib/site-settings";
import { ParticipantApplicationForm } from "@/components/participants/ParticipantApplicationForm";
import { RecoverBadgeForm } from "@/components/participants/RecoverBadgeForm";
import charter from "@/settings/charter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Participer à la JNJL",
  description:
    "Inscrivez-vous pour participer à la Journée Nationale du Jeune Leader (JNJL) au Niger : ateliers, rencontres et activités de leadership pour les jeunes.",
  path: "/participer",
});


export const dynamic = "force-dynamic";

const STEPS = ["Remplissez le formulaire", "Téléchargez votre badge", "Présentez-le le jour J"] as const;

export default async function ParticiperPage() {
  const registration = await getRegistrationState();
  if (!registration.participantsOpen) {
    return (
      <ClosedNotice
        eyebrow="Participer"
        title="Les inscriptions ne sont pas encore ouvertes"
        description="L'inscription des participants à l'événement sera bientôt disponible."
        note={registration.participantsNote}
        image="/entetes/galerie-4.jpg"
        imagePosition="50% 32%"
      />
    );
  }

  const [activeEdition, regions] = await Promise.all([
    db.edition.findFirst({
      where: { status: EditionStatus.ACTIVE, isDeleted: false },
      select: { id: true },
      orderBy: { year: "desc" },
    }),
    db.region.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Participer"
        title="Participez à la JNJL"
        description="Inscrivez-vous en quelques minutes. Votre badge est généré dès l'envoi du formulaire."
        image="/entetes/galerie-4.jpg"
        imagePosition="50% 32%"
        tint="orange"
      />

      <div className="px-4 pb-20 pt-6 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <ol
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
            style={{ color: charter.inkSoft }}
          >
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: charter.orange }}
                >
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <RecoverBadgeForm />
            <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: charter.border }}>
              <Image
                src="/header.jpg"
                alt="Journée Nationale du Jeune Leader"
                width={1000}
                height={750}
                priority
                className="h-40 w-full object-cover sm:h-52"
              />
              <ParticipantApplicationForm embedded regions={regions} hasActiveEdition={!!activeEdition} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
