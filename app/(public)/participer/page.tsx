import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { SectionHeader } from "@/components/site/SectionHeader";
import { ParticipantApplicationForm } from "@/components/participants/ParticipantApplicationForm";
import charter from "@/settings/charter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Participer à la JNJL",
  description:
    "Inscrivez-vous pour participer à la Journée Nationale du Jeune Leader (JNJL) au Niger : ateliers, rencontres et activités de leadership pour les jeunes.",
  path: "/participer",
});

export const dynamic = "force-dynamic";

export default async function ParticiperPage() {
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
    <div className="px-4 py-16 sm:px-6 sm:py-24" style={{ backgroundColor: charter.bg }}>
      <div className="mx-auto max-w-2xl">
        <SectionHeader
          eyebrow="Participer"
          title="Participez à la JNJL"
          description="Complétez ce formulaire pour déposer votre candidature de participation à la prochaine édition."
          className="mb-10"
        />
        <ParticipantApplicationForm regions={regions} hasActiveEdition={!!activeEdition} />
      </div>
    </div>
  );
}
