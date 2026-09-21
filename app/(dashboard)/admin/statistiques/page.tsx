import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { getUser } from "@/actions/getUser";
import { getEditionStatsAction } from "@/actions/stats-actions";
import { StatsDashboard } from "@/components/admin/StatsDashboard";
import { hasPermission } from "@/lib/permissions";
import type { User } from "@/types/user";

export default async function StatsPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const session = await getUser();
  const user = session?.user?.user as User | undefined;

  const stats = initialEdition ? await getEditionStatsAction(initialEdition.id) : null;

  return (
    <StatsDashboard
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialStats={stats}
      canExportAmbassadors={hasPermission(user, "applications.ambassador.manage")}
      canExportParticipants={hasPermission(user, "applications.event.manage")}
    />
  );
}
