import { listEditionsAction } from "@/actions/edition-actions";
import { EditionManager } from "@/components/admin/EditionManager";

export default async function EditionsPage() {
  const editions = await listEditionsAction();
  return <EditionManager editions={editions} />;
}
