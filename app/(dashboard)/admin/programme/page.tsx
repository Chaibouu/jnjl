import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listSpeakersAction } from "@/actions/speaker-actions";
import { ProgramManager } from "@/components/admin/ProgramManager";

export default async function ProgramPage() {
  const [editions, speakers] = await Promise.all([
    listEditionsForSelectAction(),
    listSpeakersAction(),
  ]);

  const sortedEditions = [...editions].sort((a, b) => {
    if (a.status === "ACTIVE") return -1;
    if (b.status === "ACTIVE") return 1;
    return b.year - a.year;
  });

  return <ProgramManager editions={sortedEditions} speakers={speakers} />;
}
