import { getLeaderSpaceAction } from "@/actions/leader-actions";
import { LeaderSpace } from "@/components/leader/LeaderSpace";
import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { getUser } from "@/actions/getUser";
import { getEditionStatsAction } from "@/actions/stats-actions";
import { StatsDashboard } from "@/components/admin/StatsDashboard";
import { hasPermission } from "@/lib/permissions";
import type { User } from "@/types/user";

export const dynamic = "force-dynamic";

/**
 * Le tableau de bord affiché dépend du profil : un compte avec `stats.view` (admin, staff
 * habilité) voit directement les statistiques de pilotage au lieu de l'espace ambassadeur,
 * qui reste réservé aux comptes sans cette permission (jeunes leaders, ambassadeurs...).
 */
export default async function DashboardPage() {
  const session = await getUser();
  const user = session?.user?.user as User | undefined;

  if (hasPermission(user, "stats.view")) {
    const editions = await listEditionsForSelectAction();
    const initialEdition = editions.find(edition => edition.status === "ACTIVE") ?? editions[0];
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

  const data = await getLeaderSpaceAction();
  return <LeaderSpace data={data} />;
}
