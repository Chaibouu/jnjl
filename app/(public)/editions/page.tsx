import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { listPastEditionsAction } from "@/actions/edition-content-actions";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import charter from "@/settings/charter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Éditions précédentes",
  description:
    "Revivez les éditions précédentes de la Journée Nationale du Jeune Leader (JNJL) : photos, vidéos, chiffres clés et temps forts.",
  path: "/editions",
});
export const dynamic = "force-dynamic";

export default async function PastEditionsPage() {
  const editions = await listPastEditionsAction();

  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Éditions précédentes"
        title="Revivez la JNJL"
        description="Photos, vidéos, chiffres clés et temps forts des éditions passées."
        image="/niamey.jpg"
        imagePosition="50% 55%"
        tint="green"
      />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        {editions.length === 0 ? (
          <p className="rounded-2xl border bg-white p-10 text-center text-muted-foreground shadow-sm">
            Aucune édition passée n&apos;est encore publiée.
          </p>
        ) : (
          <Reveal stagger={0.1} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {editions.map((edition, index) => {
              const accent = [charter.orange, charter.green, "#B58500"][index % 3];
              return (
                <Link
                  key={edition.id}
                  href={`/editions/${edition.slug}`}
                  className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                  style={{ borderColor: charter.border }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {edition.media[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={edition.media[0].url}
                        alt={edition.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div
                        className="flex h-full items-center justify-center text-6xl font-extrabold text-white/90"
                        style={{ background: `linear-gradient(135deg, ${accent}, ${charter.ink})` }}
                      >
                        {edition.year}
                      </div>
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(to top, ${charter.ink}99, transparent 55%)` }}
                      aria-hidden="true"
                    />
                    <span
                      className="absolute left-4 top-4 rounded-full px-3.5 py-1 text-sm font-extrabold shadow-lg"
                      style={{ backgroundColor: accent, color: "#fff" }}
                    >
                      {edition.year}
                    </span>
                  </div>

                  <div className="p-5">
                    <h2 className="text-lg font-bold" style={{ color: charter.ink }}>
                      {edition.name}
                    </h2>
                    {edition.theme && (
                      <p className="mt-1 line-clamp-2 text-sm" style={{ color: charter.inkSoft }}>
                        {edition.theme}
                      </p>
                    )}
                    <div className="mt-4 space-y-1.5 text-xs" style={{ color: charter.inkFaint }}>
                      {edition.location && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" style={{ color: accent }} />
                          {edition.location}
                        </p>
                      )}
                      {edition.startDate && (
                        <p className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" style={{ color: accent }} />
                          {new Date(edition.startDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <span
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
                      style={{ color: charter.orangeDark }}
                    >
                      Revivre cette édition
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </Reveal>
        )}
      </div>
    </div>
  );
}
