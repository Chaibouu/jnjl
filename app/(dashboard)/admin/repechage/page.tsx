import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { getRepechageCandidatesAction } from "@/actions/repechage-actions";
import { RepechageManager } from "@/components/admin/RepechageManager";
import { getUser } from "@/actions/getUser";

export default async function RepechagePage() {
  const [editions, sessionResult] = await Promise.all([
    listEditionsForSelectAction(),
    getUser(),
  ]);

  const currentUser = sessionResult?.user?.user ?? null;
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
      currentUser={
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            }
          : null
      }
    />
  );
}
