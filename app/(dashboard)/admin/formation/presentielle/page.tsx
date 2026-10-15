import { listEditionsForSelectAction } from "@/actions/edition-actions";
import {
  getInPersonTrainingStateAction,
  listInPersonTrainingAction,
} from "@/actions/inperson-training-actions";
import { InPersonTrainingManager } from "@/components/admin/InPersonTrainingManager";

export default async function InPersonTrainingPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition = editions.find(edition => edition.status === "ACTIVE") ?? editions[0];
  const rows = initialEdition ? await listInPersonTrainingAction(initialEdition.id) : [];
  const state = await getInPersonTrainingStateAction();

  return (
    <InPersonTrainingManager
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialRows={rows}
      initialOpen={state.open}
      canAuthorize={state.canAuthorize}
    />
  );
}
