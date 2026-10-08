import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { getPastEditionBySlugAction } from "@/actions/edition-content-actions";
import { toEmbedUrl } from "@/lib/video-embed";
import { CountUp } from "@/components/site/CountUp";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
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

  const dateText = edition.startDate
    ? `${new Date(edition.startDate).toLocaleDateString("fr-FR", DATE_OPTIONS)}${
        edition.endDate ? ` → ${new Date(edition.endDate).toLocaleDateString("fr-FR", DATE_OPTIONS)}` : ""
      }`
    : null;

  return (
    <div style={{ backgroundColor: charter.bg }}>
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

      <PageHero
        eyebrow={`Édition ${edition.year}`}
        title={edition.name}
        description={edition.theme ?? undefined}
        image={photos[0]?.url ?? "/niamey.jpg"}
        imagePosition="50% 50%"
        tint="green"
      >
        {edition.location && (
          <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            <MapPin className="h-4 w-4" style={{ color: charter.gold }} />
            {edition.location}
          </span>
        )}
        {dateText && (
          <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            <CalendarDays className="h-4 w-4" style={{ color: charter.gold }} />
            {dateText}
          </span>
        )}
      </PageHero>

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        <Link
          href="/editions"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:underline"
          style={{ color: charter.orangeDark }}
        >
          <ArrowLeft className="h-4 w-4" />
          Toutes les éditions
        </Link>

        {edition.stats.length > 0 && (
          <Reveal
            stagger={0.1}
            className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {edition.stats.map(stat => (
              <div
                key={stat.id}
                className="rounded-2xl px-3 py-5 text-center text-white shadow-md"
                style={{ background: `linear-gradient(135deg, ${charter.green}, #4d7a28)` }}
              >
                <p className="text-3xl font-extrabold sm:text-4xl">
                  <CountUp value={Number(stat.value)} />
                </p>
                <p className="mt-1 text-xs font-medium text-white/85">{stat.label}</p>
              </div>
            ))}
          </Reveal>
        )}

        {edition.description && (
          <section className="mt-10 rounded-2xl border bg-white p-7 shadow-sm sm:p-9" style={{ borderColor: charter.border }}>
            <h2 className="flex items-center gap-3 text-xl font-bold" style={{ color: charter.ink }}>
              <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: charter.orange }} />
              Récapitulatif
            </h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed" style={{ color: charter.inkSoft }}>
              {edition.description}
            </p>
          </section>
        )}

        {photos.length > 0 && (
          <section className="mt-12">
            <h2 className="flex items-center gap-3 text-xl font-bold" style={{ color: charter.ink }}>
              <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: charter.green }} />
              Photos
            </h2>
            <Reveal stagger={0.06} className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photos.map(photo => (
                <figure
                  key={photo.id}
                  className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ borderColor: charter.border }}
                >
                  <div className="overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? edition.name}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  {photo.caption && (
                    <figcaption className="p-3 text-xs" style={{ color: charter.inkSoft }}>
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </Reveal>
          </section>
        )}

        {videos.length > 0 && (
          <section className="mt-12">
            <h2 className="flex items-center gap-3 text-xl font-bold" style={{ color: charter.ink }}>
              <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: charter.gold }} />
              Vidéos
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {videos.map(video => {
                const embed = toEmbedUrl(video.url);
                return (
                  <div
                    key={video.id}
                    className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                    style={{ borderColor: charter.border }}
                  >
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
                    {video.caption && embed && (
                      <p className="p-3 text-xs" style={{ color: charter.inkSoft }}>
                        {video.caption}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
