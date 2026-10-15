import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CheckInError, recordBadgeCheckIn } from "@/lib/badge-checkin";
import { verifyWebhookSignature } from "@/lib/scanhub";

type ScanEvent = {
  event?: string;
  scan?: { result?: string; qr?: { externalId?: string } | null };
};

/** Compte qui signe les pointages venus de ScanHub (la table exige un utilisateur « pointeur »). */
async function resolveCheckerId(): Promise<string | null> {
  const configured = process.env.SCANHUB_CHECKER_USER_ID;
  if (configured) {
    const user = await db.user.findUnique({ where: { id: configured }, select: { id: true } });
    if (user) return user.id;
  }
  const admin = await db.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return admin?.id ?? null;
}

/**
 * Webhook ScanHub `scan.created` : un agent vient de scanner un badge à l'entrée, la présence est
 * enregistrée dans JNJL. Authentifié par la signature HMAC ; réponse 2xx pour tout scan traité ou
 * définitivement inexploitable (ScanHub ne doit pas le rejouer), 5xx seulement pour réessayer.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("scanhub-signature");

  if (!verifyWebhookSignature(rawBody, signature, process.env.SCANHUB_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let payload: ScanEvent;
  try {
    payload = JSON.parse(rawBody) as ScanEvent;
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const event = request.headers.get("scanhub-event") ?? payload.event;
  if (event === "ping") return NextResponse.json({ ok: true, outcome: "pong" });
  if (event !== "scan.created") return NextResponse.json({ ok: true, outcome: "ignored" });

  const scan = payload.scan;
  const number = scan?.qr?.externalId;
  if (!scan || scan.result !== "VALID" || !number) {
    return NextResponse.json({ ok: true, outcome: "ignored" });
  }

  try {
    const checkerId = await resolveCheckerId();
    if (!checkerId) {
      console.error("Webhook ScanHub : aucun compte pointeur disponible");
      return NextResponse.json({ error: "Configuration incomplète" }, { status: 500 });
    }
    const result = await recordBadgeCheckIn({ badgeRef: number, checkedById: checkerId });
    return NextResponse.json({ ok: true, outcome: "checked_in", name: result.name });
  } catch (error) {
    if (error instanceof CheckInError) {
      // Cas métier (déjà pointé, badge inconnu, non embarqué) : inutile de rejouer.
      return NextResponse.json({ ok: true, outcome: error.code.toLowerCase(), message: error.message });
    }
    console.error("Webhook ScanHub : pointage en échec", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
