import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listParticipantAttendanceAction } from "@/actions/participant-attendance-actions";
import { ParticipantAttendanceView } from "@/components/admin/ParticipantAttendanceView";
import charter from "@/settings/charter";

export const dynamic = "force-dynamic";

export default async function ParticipantAttendancePage() {
  const editions = await listEditionsForSelectAction();
  const edition = editions.find(item => item.status === "ACTIVE") ?? editions[0];

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Présence
        </p>
        <h1 className="mt-1 text-2xl font-bold">Pointage des participants</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Participants inscrits à l&apos;événement (sans compte) : qui a été pointé à l&apos;entrée, qui ne l&apos;est pas encore.
          {edition ? ` Édition ${edition.name} (${edition.year}).` : ""} Le pointage se fait depuis la page Présence ou au scan
          du badge.
        </p>
      </div>
      {edition ? (
        <ParticipantAttendanceView editionId={edition.id} rows={await listParticipantAttendanceAction(edition.id)} />
      ) : (
        <p className="text-sm text-muted-foreground">Aucune édition.</p>
      )}
    </section>
  );
}
