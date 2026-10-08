import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidWebhookSecret } from "@/lib/ipay";
import { confirmPaymentAttempt } from "@/lib/online-payment";

/**
 * Notification de paiement i-pay. Authentifiée par le secret partagé `Secret-Hash`, mais le
 * contenu n'est jamais cru sur parole : la tentative est revérifiée chez i-pay (statut et montant)
 * avant toute validation.
 */
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    data?: {
      external_payment_reference?: string;
      external_reference?: string;
      reference?: string;
      status?: string;
    };
  } | null;

  const data = payload?.data;
  const reference = data?.external_payment_reference ?? data?.external_reference ?? null;

  if (!isValidWebhookSecret(request.headers.get("secret-hash"))) {
    await db.paymentWebhookLog.create({
      data: { authorized: false, reference, status: data?.status ?? null, outcome: "rejected" },
    });
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let outcome = "ignored";
  if (reference) {
    try {
      outcome = await confirmPaymentAttempt(reference);
    } catch (error) {
      console.error("Webhook i-pay : confirmation en échec", error);
      outcome = "error";
    }
  }

  await db.paymentWebhookLog.create({
    data: {
      authorized: true,
      reference,
      status: data?.status ?? null,
      outcome,
      payload: payload ?? undefined,
    },
  });

  // 2xx même si la référence est inconnue : i-pay ne renvoie la notification qu'une seule fois.
  return NextResponse.json({ received: true });
}
