import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { isPaymentPending } from "@/lib/ambassador-access";
import { AmbassadorPaymentGate } from "@/components/ambassador/AmbassadorPaymentGate";
import type { User } from "@/types/user";

/**
 * Tant que le paiement n'est pas validé, toutes les pages ambassadeur sauf « Mon paiement »
 * affichent un message au lieu de leur contenu (voir lib/ambassador-access.ts).
 */
export default async function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  const session = await getUser();
  const user = session?.user?.user as User | undefined;

  let locked = false;
  if (user) {
    const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false }, select: { id: true } });
    const application = edition
      ? await db.ambassadorApplication.findFirst({
          where: { userId: user.id, editionId: edition.id },
          select: { id: true, stage: true },
        })
      : null;
    locked = application ? await isPaymentPending(application) : false;
  }

  return <AmbassadorPaymentGate locked={locked}>{children}</AmbassadorPaymentGate>;
}
