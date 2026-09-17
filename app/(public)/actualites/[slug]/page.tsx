import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedNewsBySlugAction } from "@/actions/news-actions";
import charter from "@/settings/charter";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let news;
  try {
    news = await getPublishedNewsBySlugAction(slug);
  } catch {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
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
