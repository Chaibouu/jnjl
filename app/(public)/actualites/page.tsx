import Link from "next/link";
import { listPublishedNewsAction } from "@/actions/news-actions";
import charter from "@/settings/charter";

export default async function NewsListPage() {
  const news = await listPublishedNewsAction();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Actualités
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Toute l’actualité de la JNJL</h1>
      </div>

      {news.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          Aucune actualité publiée pour le moment.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {news.map(item => (
            <Link
              key={item.id}
              href={`/actualites/${item.slug}`}
              className="group overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {item.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">JNJL</div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.category && (
                    <span className="font-semibold uppercase tracking-wide" style={{ color: charter.orange }}>
                      {item.category}
                    </span>
                  )}
                  {item.publishedAt && (
                    <span>· {new Date(item.publishedAt).toLocaleDateString("fr-FR")}</span>
                  )}
                </div>
                <h2 className="mt-1.5 font-semibold leading-snug">{item.title}</h2>
                {item.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
