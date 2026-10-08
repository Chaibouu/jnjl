import { randomBytes, timingSafeEqual } from "crypto";

/** Frais d'inscription ambassadeur (Règle 8) — fixé côté serveur, jamais fourni par le navigateur. */
export const AMBASSADOR_FEE = 5000;

/** Durée de vie d'un lien i-pay (fixée par le prestataire). */
export const PAYMENT_LINK_TTL_MS = 30 * 60 * 1000;

const BASE_URL = "https://i-pay.money/api/v1";

export type IpayLinkState =
  | { state: "succeeded"; amount: number; transactionId: string | null; msisdn: string | null }
  | { state: "failed"; transactionId: string | null }
  | { state: "expired" }
  | { state: "pending" };

function config() {
  const secret = process.env.IPAY_SECRET_KEY;
  const environment = process.env.IPAY_ENV === "live" ? "live" : "sandbox";
  if (!secret) throw new Error("Le paiement en ligne n'est pas configuré (IPAY_SECRET_KEY manquante)");
  return { secret, environment };
}

/** Référence aléatoire à forte entropie (≥ 32 caractères exigés par i-pay). */
export function newPaymentReference() {
  return randomBytes(24).toString("hex");
}

export async function createPaymentLink(params: {
  reference: string;
  amount: number;
  title: string;
  description: string;
  successUrl?: string;
  failedUrl?: string;
}): Promise<{ pageUrl: string }> {
  const { secret, environment } = config();
  const response = await fetch(`${BASE_URL}/external_payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "Ipay-Target-Environment": environment,
      "Ipay-Payment-Type": "external_payment",
    },
    body: JSON.stringify({
      title: params.title,
      description: params.description,
      amount: params.amount,
      reference: params.reference,
      shouldExpire: true,
      // i-pay n'accepte que des URL HTTPS (absent en développement local).
      ...(params.successUrl?.startsWith("https://") ? { on_success_redirection_url: params.successUrl } : {}),
      ...(params.failedUrl?.startsWith("https://") ? { on_failed_redirection_url: params.failedUrl } : {}),
    }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as { page_url?: string; message?: string };
  if (!response.ok || !body.page_url) {
    console.error("i-pay: création du lien refusée", response.status, body);
    throw new Error("Le service de paiement est momentanément indisponible. Réessayez dans un instant.");
  }
  return { pageUrl: body.page_url };
}

/** État réel d'un lien chez i-pay (route publique, sans clé). `null` si le prestataire est injoignable. */
export async function getPaymentLinkState(reference: string): Promise<IpayLinkState | null> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/external_payments/${encodeURIComponent(reference)}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (response.status === 404) return { state: "expired" };
  if (!response.ok) return null;

  const body = (await response.json().catch(() => null)) as {
    status?: string;
    amount?: number;
    transaction_id?: string;
    msisdn?: string;
  } | null;
  if (!body) return null;

  switch (body.status) {
    case "succeeded":
      return {
        state: "succeeded",
        amount: Number(body.amount ?? 0),
        transactionId: body.transaction_id ?? null,
        msisdn: body.msisdn ?? null,
      };
    case "failed":
      return { state: "failed", transactionId: body.transaction_id ?? null };
    case "cancelled":
      return { state: "expired" };
    default:
      return { state: "pending" };
  }
}

/** Comparaison à temps constant du secret partagé envoyé par i-pay (`Secret-Hash`). */
export function isValidWebhookSecret(received: string | null): boolean {
  const expected = process.env.IPAY_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
