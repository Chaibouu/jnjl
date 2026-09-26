import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listDocumentTemplatesAction } from "@/actions/document-template-actions";
import { DocumentTemplatesManager } from "@/components/admin/DocumentTemplatesManager";

export default async function DocumentTemplatesPage() {
  const [editions, templates] = await Promise.all([
    listEditionsForSelectAction(),
    listDocumentTemplatesAction(),
  ]);
  const initialEdition = editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  if (!initialEdition) {
    return <p className="p-6 text-sm text-muted-foreground">Créez d&apos;abord une édition pour personnaliser ses documents.</p>;
  }

  return (
    <DocumentTemplatesManager
      editions={editions}
      initialEditionId={initialEdition.id}
      initialTemplates={templates}
    />
  );
}
