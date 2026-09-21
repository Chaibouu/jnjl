import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedNewsBySlugAction } from "@/actions/news-actions";
import charter from "@/settings/charter";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  try {
    const news = await getPublishedNewsBySlugAction(slug);
    return buildMetadata({
      title: news.title,
      description: news.excerpt || news.content,
      path: `/actualites/${news.slug}`,
      image: news.coverImage,
      type: "article",
      publishedTime: news.publishedAt,
      modifiedTime: news.updatedAt,
    });
  } catch {
    // Article introuvable : la page renverra un 404, jamais indexé.
    return { title: "Actualité introuvable", robots: { index: false, follow: false } };
  }
}

export default async function NewsDetailPage({ params }: Params) {
  const { slug } = await params;

  let news;
  try {
    news = await getPublishedNewsBySlugAction(slug);
  } catch {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={[
          articleJsonLd({
            title: news.title,
            description: news.excerpt || news.content,
            path: `/actualites/${news.slug}`,
            image: news.coverImage,
            publishedAt: news.publishedAt,
            updatedAt: news.updatedAt,
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Actualités", path: "/actualites" },
            { name: news.title, path: `/actualites/${news.slug}` },
          ]),
        ]}
      />
      <Link href="/actualites" className="text-sm text-muted-foreground hover:text-foreground">
        ← Toutes les actualités
      </Link>

      <div className="mt-4">
        {news.category && (
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: charter.orange }}>
            {news.category}
          </span>
        )}
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{news.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {news.publishedAt && new Date(news.publishedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          {news.edition && ` — ${news.edition.name} (${news.edition.year})`}
        </p>
      </div>

      {news.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={news.coverImage} alt={news.title} className="mt-6 w-full rounded-2xl object-cover" />
      )}

      <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-line text-base leading-relaxed">
        {news.content}
      </div>
    </article>
  );
}
