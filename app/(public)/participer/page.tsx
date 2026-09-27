import Image from "next/image";
import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { SectionHeader } from "@/components/site/SectionHeader";
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
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Participer"
          title="Participez à la JNJL"
          description="Complétez ce formulaire pour déposer votre candidature de participation à la prochaine édition."
          className="mb-8"
        />
        <RecoverBadgeForm />
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: charter.border }}>
          <Image
            src="/header.jpg"
            alt="Journée Nationale du Jeune Leader"
            width={1000}
            height={750}
            priority
            className="h-48 w-full object-cover sm:h-64"
          />
          <ParticipantApplicationForm embedded regions={regions} hasActiveEdition={!!activeEdition} />
        </div>
      </div>
    </div>
  );
}
