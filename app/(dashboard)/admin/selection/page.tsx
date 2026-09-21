import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { getRankingAction } from "@/actions/selection-actions";
import { SelectionManager } from "@/components/admin/SelectionManager";

export default async function SelectionPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const initialGroups = initialEdition
    ? await getRankingAction(initialEdition.id)
    : [];

  return (
    <SelectionManager
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialGroups={initialGroups}
    />
  );
}
