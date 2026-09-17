import { listAmbassadorPaymentsAction } from "@/actions/payment-actions";
import { PaymentsManager } from "@/components/admin/PaymentsManager";

export default async function PaymentsPage() {
  const applications = await listAmbassadorPaymentsAction();
  return <PaymentsManager applications={applications} />;
}
