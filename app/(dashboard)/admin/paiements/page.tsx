import { getUser } from "@/actions/getUser";
import { listPaymentAttemptsAction } from "@/actions/online-payment-actions";
import { listAmbassadorPaymentsAction } from "@/actions/payment-actions";
import { PaymentAttemptsPanel } from "@/components/admin/PaymentAttemptsPanel";
import { PaymentsManager } from "@/components/admin/PaymentsManager";
import { hasPermission } from "@/lib/permissions";
import type { User } from "@/types/user";

export default async function PaymentsPage() {
  const [applications, attempts, session] = await Promise.all([
    listAmbassadorPaymentsAction(),
    listPaymentAttemptsAction(),
    getUser(),
  ]);
  const user = session?.user?.user as User | undefined;
  return (
    <div className="space-y-6">
      <PaymentAttemptsPanel attempts={attempts} />
      <PaymentsManager
        applications={applications}
        canAuthorizeManual={hasPermission(user, "payments.validate")}
      />
    </div>
  );
}
