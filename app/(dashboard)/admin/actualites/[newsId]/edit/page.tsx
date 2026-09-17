import Link from "next/link";
import { getNewsAction } from "@/actions/news-actions";
import { NewsForm } from "@/components/admin/NewsForm";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ newsId: string }>;
}) {
  const { newsId } = await params;
  const news = await getNewsAction(newsId);

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/admin/actualites"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour aux actualités
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Modifier l’actualité</h1>
      </div>
      <NewsForm news={news} />
    </section>
  );
}
