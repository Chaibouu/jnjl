import { NextRequest, NextResponse } from "next/server";
import { CheckInError, recordBadgeCheckIn } from "@/lib/badge-checkin";
import { getWebhookSecret, verifyWebhookSignature } from "@/lib/scanhub";
import { resolveScanHubCheckerId } from "@/lib/scanhub-reconcile";

type ScanEvent = {
  event?: string;
  scan?: { result?: string; scannedAt?: string; qr?: { externalId?: string } | null };
};

/**
 * Webhook ScanHub `scan.created` : un agent vient de scanner un badge à l'entrée, la présence est
 * enregistrée dans JNJL. Authentifié par la signature HMAC ; réponse 2xx pour tout scan traité ou
 * définitivement inexploitable (ScanHub ne doit pas le rejouer), 5xx seulement pour réessayer.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("scanhub-signature");

  if (!verifyWebhookSignature(rawBody, signature, getWebhookSecret())) {
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
    const checkerId = await resolveScanHubCheckerId();
    if (!checkerId) {
      console.error("Webhook ScanHub : aucun compte pointeur disponible");
      return NextResponse.json({ error: "Configuration incomplète" }, { status: 500 });
    }
    const result = await recordBadgeCheckIn({
      badgeRef: number,
      checkedById: checkerId,
      at: scan.scannedAt ? new Date(scan.scannedAt) : undefined,
    });
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
