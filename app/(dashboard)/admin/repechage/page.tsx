import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { getRepechageCandidatesAction } from "@/actions/repechage-actions";
import { RepechageManager } from "@/components/admin/RepechageManager";

export default async function RepechagePage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const initialCandidates = initialEdition
    ? await getRepechageCandidatesAction(initialEdition.id)
    : [];

  return (
    <RepechageManager
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialCandidates={initialCandidates}
    />
  );
}
