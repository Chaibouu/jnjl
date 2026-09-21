import { getLeaderSpaceAction } from "@/actions/leader-actions";
import { LeaderSpace } from "@/components/leader/LeaderSpace";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getLeaderSpaceAction();
  return <LeaderSpace data={data} />;
}
