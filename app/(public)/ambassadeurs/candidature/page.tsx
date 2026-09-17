import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AmbassadorApplicationForm } from "@/components/ambassadors/AmbassadorApplicationForm";
import charter from "@/settings/charter";
import appConfig from "@/settings";
import Image from "next/image";

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
    <main
      className="min-h-screen px-4 py-8 sm:px-6 sm:py-12"
      style={{ backgroundColor: charter.bg }}
    >
      <div className="mx-auto max-w-4xl">
        <header
          className="relative mb-7 overflow-hidden rounded-3xl px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10"
          style={{
            background: `linear-gradient(135deg, ${charter.ink} 0%, #3b3b3b 70%, ${charter.orangeDark} 160%)`,
          }}
        >
          <div
            className="absolute -right-16 -top-20 h-48 w-48 rounded-full border-[24px] border-white/10"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-lg sm:h-24 sm:w-24">
              <Image
                src={appConfig.logoUrl}
                alt={`Logo ${appConfig.appName}`}
                width={96}
                height={96}
                priority
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                JNJL · Réseau des ambassadeurs
              </p>
              <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
                Votre candidature commence ici.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                Complétez les trois étapes. Votre demande sera étudiée par
                l’équipe JNJL avant toute création de compte.
              </p>
            </div>
          </div>
        </header>
        <AmbassadorApplicationForm
          activeEdition={activeEdition}
          regions={regions}
        />
      </div>
    </main>
  );
}
