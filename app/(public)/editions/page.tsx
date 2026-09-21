import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { listPastEditionsAction } from "@/actions/edition-content-actions";
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
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Éditions précédentes
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Revivez la JNJL</h1>
      </div>

      {editions.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          Aucune édition passée n&apos;est encore publiée.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {editions.map(edition => (
            <Link
              key={edition.id}
              href={`/editions/${edition.slug}`}
              className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-[16/9] bg-muted">
                {edition.media[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={edition.media[0].url}
                    alt={edition.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
                  {edition.year}
                </p>
                <h2 className="mt-1 text-lg font-bold">{edition.name}</h2>
                {edition.theme && <p className="mt-1 text-sm text-muted-foreground">{edition.theme}</p>}
                {edition.location && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {edition.location}
                  </p>
                )}
                {edition.startDate && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(edition.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
