import { listNewsAction } from "@/actions/news-actions";
import { NewsManager } from "@/components/admin/NewsManager";

export default async function NewsPage() {
  const news = await listNewsAction();
  return <NewsManager news={news} />;
}
