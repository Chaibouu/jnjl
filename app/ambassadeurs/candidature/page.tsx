import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AmbassadorApplicationForm } from "@/components/ambassadors/AmbassadorApplicationForm";

export const dynamic = "force-dynamic";

export default async function AmbassadorApplicationPage() {
  const [activeEdition, regions] = await Promise.all([
    db.edition.findFirst({
      where: { status: EditionStatus.ACTIVE, isDeleted: false },
      select: { id: true, name: true, year: true },
      orderBy: { year: "desc" },
    }),
    db.region.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            JNJL · Ambassadeurs
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Candidature ambassadeur
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Rejoignez le réseau des jeunes ambassadeurs en créant votre compte
            et en sélectionnant votre région.
          </p>
        </div>
        <AmbassadorApplicationForm
          activeEdition={activeEdition}
          regions={regions}
        />
      </div>
    </main>
  );
}
