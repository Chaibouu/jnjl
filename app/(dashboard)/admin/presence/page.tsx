import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listAttendanceAction, listAttendanceSessionsAction } from "@/actions/attendance-actions";
import { AttendanceManager } from "@/components/admin/AttendanceManager";

export default async function AttendancePage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const [sessions, data] = initialEdition
    ? await Promise.all([
        listAttendanceSessionsAction(initialEdition.id),
        listAttendanceAction(initialEdition.id),
      ])
    : [[], { total: 0, records: [], awaiting: [] }];

  return (
    <AttendanceManager
      editions={editions}
      initialEditionId={initialEdition?.id ?? ""}
      initialSessions={sessions}
      initialData={data}
    />
  );
}
