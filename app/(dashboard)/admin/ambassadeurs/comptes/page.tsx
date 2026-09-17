import { listAmbassadorAccountsAction } from "@/actions/ambassador-account-actions";
import { AmbassadorAccountManager } from "@/components/admin/AmbassadorAccountManager";

export default async function AmbassadorAccountsPage() {
  const accounts = await listAmbassadorAccountsAction();
  return <AmbassadorAccountManager accounts={accounts} />;
}
