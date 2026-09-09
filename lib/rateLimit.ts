/**
 * Rate Limiting — deux couches :
 *
 * 1. Middleware (Edge Runtime) → in-memory, utilisé dans middleware.ts
 *    Rapide, stateless, première ligne de défense.
 *
 * 2. API Routes (Node.js Runtime) → Redis sliding window, multi-instance
 *    `rateLimitRedis()` — à appeler en tête des routes sensibles.
 *    Persistant entre redémarrages, partagé entre plusieurs instances PM2.
 *
 * ⚠️  `redis` et `rateLimitRedis` ne peuvent PAS être utilisés dans le middleware
 *     (Edge Runtime ne supporte pas ioredis / TCP).
 */

import { NextRequest, NextResponse } from "next/server";
import appConfig from "@/settings";
import { getClientIP } from "./geo";

// ─── Couche 1 : In-memory (Middleware / Edge) ─────────────────────────────────

interface RequestRecord {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const stores = new Map<string, Map<string, RequestRecord>>();

function getStore(storeKey: string): Map<string, RequestRecord> {
  if (!stores.has(storeKey)) stores.set(storeKey, new Map());
  return stores.get(storeKey)!;
}

function cleanStore(store: Map<string, RequestRecord>, windowMs: number) {
  const now = Date.now();
  for (const [ip, r] of store.entries()) {
    if (now - r.windowStart > windowMs * 2) store.delete(ip);
  }
}

export async function applyRateLimit(
  req: NextRequest,
  config?: RateLimitConfig,
  storeKey = "global"
): Promise<NextResponse | null> {
  const { windowMs, max } = config ?? appConfig.rateLimit;
  const ip = getClientIP(req);
  const store = getStore(storeKey);

  if (Math.random() < 0.02) cleanStore(store, windowMs);

  const now = Date.now();
  const existing = store.get(ip);

  if (!existing || now - existing.windowStart >= windowMs) {
    store.set(ip, { count: 1, windowStart: now });
    return null;
  }

  existing.count += 1;

  if (existing.count > max) {
    const retryAfterSec = Math.ceil((windowMs - (now - existing.windowStart)) / 1000);
    return NextResponse.json(
      { error: "Trop de requêtes, veuillez réessayer plus tard.", retryAfter: retryAfterSec },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((existing.windowStart + windowMs) / 1000)),
        },
      }
    );
  }

  return null;
}

export const rateLimitAuth  = (req: NextRequest) => applyRateLimit(req, appConfig.rateLimitAuth, "auth");
export const rateLimitEmail = (req: NextRequest) => applyRateLimit(req, appConfig.rateLimitEmail, "email");

// ─── Couche 2 : Redis sliding window (API Routes / Node.js) ──────────────────

/**
 * Rate limiting Redis — sliding window avec sorted sets.
 * Persistant et partagé entre toutes les instances PM2.
 *
 * @param key       Clé unique (ex: `"login:${ip}"`, `"signup:${email}"`)
 * @param config    Fenêtre et max requêtes
 * @returns         NextResponse 429 si limite atteinte, null sinon
 */
export async function rateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  try {
    // Import dynamique — ioredis uniquement en Node.js runtime
    const { redis } = await import("./redis");
    const { windowMs, max } = config;

    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `rl:${key}`;

    // Pipeline atomique : supprimer les entrées expirées + ajouter la courante + compter
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, "-inf", windowStart);  // Nettoyage
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);   // Ajout
    pipeline.zcard(redisKey);                                   // Comptage
    pipeline.pexpire(redisKey, windowMs);                      // TTL auto-nettoyage

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    if (count > max) {
      const retryAfterSec = Math.ceil(windowMs / 1000);
      return NextResponse.json(
        { error: "Trop de requêtes, veuillez réessayer plus tard.", retryAfter: retryAfterSec },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    return null;
  } catch {
    // Si Redis est indisponible, fail open (ne pas bloquer les utilisateurs)
    return null;
  }
}

// Raccourcis Redis pour les endpoints critiques
export const rateLimitRedisAuth = (ip: string) =>
  rateLimitRedis(`auth:${ip}`, appConfig.rateLimitAuth);

export const rateLimitRedisEmail = (ip: string) =>
  rateLimitRedis(`email:${ip}`, appConfig.rateLimitEmail);
