import { getMyPaymentStateAction } from "@/actions/online-payment-actions";
import { MyPayment } from "@/components/ambassador/MyPayment";

export const dynamic = "force-dynamic";

export default async function MyPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ retour?: string }>;
}) {
  const { retour } = await searchParams;
  const state = await getMyPaymentStateAction();
  return <MyPayment initialState={state} returning={retour === "1"} failed={retour === "echec"} />;
}
