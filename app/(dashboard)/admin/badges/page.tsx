import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listBadgeCandidatesAction } from "@/actions/badge-actions";
import { BadgesManager } from "@/components/admin/BadgesManager";

export default async function BadgesPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const candidates = initialEdition
    ? await listBadgeCandidatesAction(initialEdition.id)
    : [];

  return (
    <BadgesManager
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialCandidates={candidates}
    />
  );
}
