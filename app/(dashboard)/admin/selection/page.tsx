import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { getRankingAction } from "@/actions/selection-actions";
import { getUser } from "@/actions/getUser";
import { SelectionManager } from "@/components/admin/SelectionManager";

export default async function SelectionPage() {
  const session = await getUser();
  const role = (session?.user?.user as { role?: string } | undefined)?.role;
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
      canManage={role === "ADMIN" || role === "SUPER_ADMIN"}
    />
  );
}
