import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listAccessPassesAction } from "@/actions/access-pass-actions";
import { AccessPassManager } from "@/components/admin/AccessPassManager";

export const dynamic = "force-dynamic";

export default async function AccessPassesPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition = editions.find(edition => edition.status === "ACTIVE") ?? editions[0];
  const passes = initialEdition ? await listAccessPassesAction(initialEdition.id) : [];

  return (
    <AccessPassManager
      editions={editions.map(edition => ({ id: edition.id, name: edition.name, year: edition.year }))}
      initialEditionId={initialEdition?.id ?? ""}
      initialPasses={passes}
    />
  );
}
