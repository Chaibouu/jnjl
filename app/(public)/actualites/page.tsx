import { listPublishedNewsAction } from "@/actions/news-actions";
import { NewsCard } from "@/components/site/NewsCard";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import charter from "@/settings/charter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Actualités",
  description:
    "Toute l'actualité de la Journée Nationale du Jeune Leader (JNJL) : annonces, comptes rendus, témoignages et nouvelles de la jeunesse nigérienne.",
  path: "/actualites",
});

export default async function NewsListPage() {
  const news = await listPublishedNewsAction();

  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Actualités"
        title="Toute l’actualité de la JNJL"
        description="Annonces, comptes rendus, témoignages : suivez la vie de la jeunesse nigérienne engagée."
        image="/entetes/actualites.jpg"
        imagePosition="50% 55%"
        tint="green"
      />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        {news.length === 0 ? (
          <p className="rounded-2xl border bg-white p-10 text-center text-muted-foreground shadow-sm">
            Aucune actualité publiée pour le moment.
          </p>
        ) : (
          <Reveal stagger={0.1} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item, index) => (
              <NewsCard key={item.id} item={item} index={index} />
            ))}
          </Reveal>
        )}
      </div>
    </div>
  );
}
