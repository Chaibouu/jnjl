/**
 * Logger structuré — Pino
 *
 * Dev  : sortie colorée lisible (pino-pretty)
 * Prod : JSON brut → compatible Datadog, Grafana Loki, CloudWatch…
 *
 * Usage :
 *   import { logger } from '@/lib/logger';
 *   logger.info({ userId, action: 'LOGIN' }, 'Connexion réussie');
 *   logger.error({ err }, 'Erreur serveur');
 *   logger.logAuth('LOGIN_SUCCESS', userId, email);
 */

import pino, { Logger as PinoLogger } from "pino";

const isDev = process.env.NODE_ENV !== "production";

const base = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: { app: "website-starter", env: process.env.NODE_ENV ?? "development" },
  timestamp: pino.stdTimeFunctions.isoTime,

  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname,app,env",
      },
    },
  }),
}) as PinoLogger;

// ─── Wrapper avec méthodes métier ─────────────────────────────────────────────

class AppLogger {
  // Accès direct aux niveaux Pino
  readonly trace = base.trace.bind(base);
  readonly debug = base.debug.bind(base);
  readonly info  = base.info.bind(base);
  readonly warn  = base.warn.bind(base);
  readonly error = base.error.bind(base);
  readonly fatal = base.fatal.bind(base);

  /** Log d'une requête HTTP */
  logRequest(method: string, path: string, statusCode: number, durationMs: number) {
    base.info({ method, path, statusCode, durationMs }, "HTTP Request");
  }

  /** Log d'une action d'authentification — masque l'email */
  logAuth(action: string, userId?: string, email?: string) {
    base.info(
      {
        action,
        userId,
        // Masque : john***@example.com
        email: email ? email.replace(/^(.{2})(.*)(@.*)$/, "$1***$3") : undefined,
      },
      `Auth: ${action}`
    );
  }

  /** Log d'une opération base de données */
  logDatabase(operation: string, table: string, durationMs?: number) {
    base.debug({ operation, table, durationMs }, `DB: ${operation} on ${table}`);
  }

  /** Log de sécurité — niveau warn par défaut */
  logSecurity(event: string, context?: Record<string, unknown>) {
    base.warn({ event, ...context }, `Security: ${event}`);
  }
}

export const logger = new AppLogger();
export default logger;

// Types utilitaires
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
