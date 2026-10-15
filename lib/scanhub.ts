import crypto from "crypto";

/**
 * Client ScanHub : les QR des badges sont créés, activés et contrôlés par ScanHub (jetons aléatoires
 * de 128 bits, anti-doublon, mode hors-ligne). JNJL ne garde que le jeton et reçoit les scans par webhook.
 *
 * Variables d'environnement : SCANHUB_URL, SCANHUB_API_KEY, SCANHUB_WEBHOOK_SECRET,
 * SCANHUB_EVENT_ID (optionnel), SCANHUB_CHECKER_USER_ID (optionnel).
 */

const TIMEOUT_MS = 8000;
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export function isScanHubEnabled(): boolean {
  return Boolean(process.env.SCANHUB_URL && process.env.SCANHUB_API_KEY);
}

export type ScanHubQr = {
  id: string;
  externalId?: string;
  token: string | null;
  status: string;
  created: boolean;
};

async function request<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const baseUrl = process.env.SCANHUB_URL?.replace(/\/+$/, "");
  const apiKey = process.env.SCANHUB_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("ScanHub n'est pas configuré");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/api/v1/integrations${path}`, {
      method: init.method,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | { data?: T; message?: string; error?: string }
      | null;
    if (!response.ok) {
      throw new Error(payload?.message ?? payload?.error ?? `ScanHub a répondu ${response.status}`);
    }
    // Les réponses ScanHub enveloppent le résultat dans `data` ; on accepte aussi un corps brut.
    return (payload && payload.data !== undefined ? payload.data : payload) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Crée (ou retrouve, l'appel est idempotent sur le numéro) le QR d'un badge. Usage unique. */
export async function registerBadgeQr(input: {
  number: string;
  holderName: string;
  holderEmail?: string | null;
  role: string;
  metadata?: Record<string, unknown>;
}): Promise<ScanHubQr> {
  return request<ScanHubQr>("/qrs", {
    method: "POST",
    body: {
      externalId: input.number,
      type: "BADGE",
      reusable: false,
      holderName: input.holderName.slice(0, 150),
      ...(input.holderEmail ? { holderEmail: input.holderEmail } : {}),
      holderRole: input.role.slice(0, 100),
      ...(process.env.SCANHUB_EVENT_ID ? { eventId: process.env.SCANHUB_EVENT_ID } : {}),
      metadata: { source: "jnjl", number: input.number, ...input.metadata },
    },
  });
}

/** Active (restore) ou désactive (revoke) le QR d'un badge : un QR désactivé est refusé à l'entrée. */
export async function setBadgeQrActive(number: string, active: boolean): Promise<void> {
  try {
    await request(`/qrs/${encodeURIComponent(number)}/${active ? "restore" : "revoke"}`, { method: "POST" });
  } catch (error) {
    // Déjà dans l'état voulu : rien à faire.
    const message = error instanceof Error ? error.message : "";
    if (/n'est pas révoqué|déjà révoqué/i.test(message)) return;
    throw error;
  }
}

/**
 * Vérifie l'en-tête `ScanHub-Signature: t=<horodatage>,v1=<HMAC-SHA256 de "t.corps">`
 * (comparaison à temps constant, horodatage dans une fenêtre de 5 minutes).
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
  now: number = Date.now()
): boolean {
  if (!header || !secret) return false;
  const parts: Record<string, string> = {};
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index > 0) parts[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!Number.isFinite(timestamp) || !signature) return false;
  if (Math.abs(now / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
