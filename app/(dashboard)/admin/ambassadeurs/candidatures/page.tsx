import { listAmbassadorApplicationsAction } from "@/actions/ambassador-application-actions";
import { AmbassadorApplicationManager } from "@/components/admin/AmbassadorApplicationManager";

export default async function AmbassadorApplicationsPage() {
  const applications = await listAmbassadorApplicationsAction();
  return <AmbassadorApplicationManager initialApplications={applications} />;
}
