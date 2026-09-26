import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listAmbassadorProgressAction } from "@/actions/ambassador-progress-actions";
import { AmbassadorProgressTracker } from "@/components/admin/AmbassadorProgressTracker";

export default async function AmbassadorProgressPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition = editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const rows = initialEdition ? await listAmbassadorProgressAction(initialEdition.id) : [];

  return (
    <AmbassadorProgressTracker
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialRows={rows}
    />
  );
}
