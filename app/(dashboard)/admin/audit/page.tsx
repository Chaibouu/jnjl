import { listAuditLogAction } from "@/actions/audit-log-actions";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const { entries, actions } = await listAuditLogAction();
  return <AuditLogViewer initialEntries={entries} actions={actions} />;
}
