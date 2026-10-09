import { requireSuperAdmin } from "@/actions/requirePermission";
import { getEmailCenterAction } from "@/actions/email-campaign-actions";
import { EmailCenter } from "@/components/admin/EmailCenter";

export const dynamic = "force-dynamic";

export default async function EmailCenterPage() {
  // Réservé au Super Admin : mêmes règles que le menu, vérifiées aussi côté serveur.
  await requireSuperAdmin();
  const center = await getEmailCenterAction();
  return <EmailCenter initial={center} />;
}
