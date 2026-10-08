import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { reconcilePendingPayments } from "@/lib/online-payment";

export const dynamic = "force-dynamic";

/**
 * Rattrapage automatique : revérifie chez i-pay toutes les tentatives de paiement en attente,
 * même si le candidat a fermé sa page et qu'aucune notification n'est arrivée.
 * À appeler toutes les quelques minutes avec `Authorization: Bearer <CRON_SECRET>`
 * (cron Vercel ou service de cron externe).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET non configurée" }, { status: 503 });

  const received = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  return NextResponse.json(await reconcilePendingPayments());
}
