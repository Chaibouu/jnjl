import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { getPastEditionBySlugAction } from "@/actions/edition-content-actions";
import { toEmbedUrl } from "@/lib/video-embed";
import charter from "@/settings/charter";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, buildMetadata, eventJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

const DATE_OPTIONS = { day: "numeric", month: "long", year: "numeric" } as const;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const edition = await getPastEditionBySlugAction(slug);
  if (!edition) return { title: "Édition introuvable", robots: { index: false, follow: false } };
  return buildMetadata({
    title: `${edition.name} — édition ${edition.year}`,
    description: edition.description || edition.theme || `Revivez l'édition ${edition.year} de la Journée Nationale du Jeune Leader.`,
    path: `/editions/${edition.slug}`,
    image: edition.media.find(item => item.type === "PHOTO")?.url,
  });
}

export default async function PastEditionPage({ params }: Params) {
  const { slug } = await params;
  const edition = await getPastEditionBySlugAction(slug);
  if (!edition) notFound();

  const photos = edition.media.filter(item => item.type === "PHOTO");
  const videos = edition.media.filter(item => item.type === "VIDEO");

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <JsonLd
        data={[
          eventJsonLd({
            name: edition.name,
            description: edition.description,
            theme: edition.theme,
            location: edition.location,
            startDate: edition.startDate,
            endDate: edition.endDate,
            path: `/editions/${edition.slug}`,
            image: photos[0]?.url,
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Éditions précédentes", path: "/editions" },
            { name: edition.name, path: `/editions/${edition.slug}` },
          ]),
        ]}
      />
      <Link href="/editions" className="text-sm text-muted-foreground hover:text-foreground">
        ← Toutes les éditions
      </Link>

      <header className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Édition {edition.year}
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{edition.name}</h1>
        {edition.theme && <p className="mt-2 text-lg text-muted-foreground">{edition.theme}</p>}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {edition.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {edition.location}
            </span>
          )}
          {edition.startDate && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {new Date(edition.startDate).toLocaleDateString("fr-FR", DATE_OPTIONS)}
              {edition.endDate && ` → ${new Date(edition.endDate).toLocaleDateString("fr-FR", DATE_OPTIONS)}`}
            </span>
          )}
        </div>
      </header>

      {edition.stats.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {edition.stats.map(stat => (
            <div key={stat.id} className="rounded-2xl border bg-white p-5 text-center shadow-sm">
              <p className="text-3xl font-bold" style={{ color: charter.orange }}>
                {stat.value.toLocaleString("fr-FR")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {edition.description && (
        <div className="mt-10">
          <h2 className="text-xl font-bold">Récapitulatif</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{edition.description}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold">Photos</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map(photo => (
              <figure key={photo.id} className="overflow-hidden rounded-xl border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? edition.name} className="aspect-[4/3] w-full object-cover" />
                {photo.caption && <figcaption className="bg-white p-2 text-xs text-muted-foreground">{photo.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold">Vidéos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {videos.map(video => {
              const embed = toEmbedUrl(video.url);
              return (
                <div key={video.id} className="overflow-hidden rounded-xl border bg-white">
                  {embed ? (
                    <iframe
                      src={embed}
                      title={video.caption ?? "Vidéo"}
                      className="aspect-video w-full"
                      allow="encrypted-media; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  ) : (
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="block p-6 text-sm underline">
                      {video.caption ?? video.url}
                    </a>
                  )}
                  {video.caption && embed && <p className="p-2 text-xs text-muted-foreground">{video.caption}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
