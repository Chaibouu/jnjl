import { listEditionsForSelectAction } from "@/actions/edition-actions";
import {
  getEditionEngagementAction,
  listEngagementStatusAction,
} from "@/actions/engagement-actions";
import { EngagementManager } from "@/components/admin/EngagementManager";

export default async function EngagementPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const [edition, candidates] = initialEdition
    ? await Promise.all([
        getEditionEngagementAction(initialEdition.id),
        listEngagementStatusAction(initialEdition.id),
      ])
    : [null, []];

  return (
    <EngagementManager
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialText={edition?.engagementText ?? ""}
      initialCandidates={candidates}
    />
  );
}
