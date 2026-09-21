import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listDocumentCandidatesAction } from "@/actions/document-actions";
import { DocumentsManager } from "@/components/admin/DocumentsManager";

export default async function DocumentsPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const initialCandidates = initialEdition
    ? await listDocumentCandidatesAction(initialEdition.id)
    : [];

  return (
    <DocumentsManager
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialCandidates={initialCandidates}
    />
  );
}
