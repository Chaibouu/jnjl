import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listBoardingAction } from "@/actions/boarding-actions";
import { BoardingManager } from "@/components/admin/BoardingManager";

export default async function BoardingPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const rows = initialEdition ? await listBoardingAction(initialEdition.id) : [];

  return (
    <BoardingManager
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialRows={rows}
    />
  );
}
