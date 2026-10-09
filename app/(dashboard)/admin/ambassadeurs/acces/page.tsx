import { requireSuperAdmin } from "@/actions/requirePermission";
import { getAccessOverviewAction } from "@/actions/access-management-actions";
import { AccessManager } from "@/components/admin/AccessManager";

export const dynamic = "force-dynamic";

export default async function AmbassadorAccessPage() {
  // Réservé au Super Admin : mêmes règles que le menu, vérifiées aussi côté serveur.
  await requireSuperAdmin();
  const overview = await getAccessOverviewAction();
  return <AccessManager initial={overview} />;
}
