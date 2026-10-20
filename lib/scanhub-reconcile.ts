import { db } from "@/lib/db";
import { CheckInError, recordBadgeCheckIn } from "@/lib/badge-checkin";
import { isScanHubEnabled, listScans } from "@/lib/scanhub";

/** Réglage (table `settings`) : identifiant du dernier scan ScanHub déjà traité (curseur de lecture). */
const CURSOR_KEY = "scanhub.scans_cursor";
const MAX_PAGES_PER_RUN = 20;

/** Compte qui signe les pointages venus de ScanHub (la table exige un utilisateur « pointeur »). */
export async function resolveScanHubCheckerId(): Promise<string | null> {
  const configured = process.env.SCANHUB_CHECKER_USER_ID?.trim();
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

export type ReconcileResult = {
  enabled: boolean;
  /** Scans lus chez ScanHub depuis le dernier passage. */
  read: number;
  /** Présences enregistrées par ce rattrapage (celles que le webhook n'avait pas apportées). */
  checkedIn: number;
  /** Scans déjà connus de JNJL (webhook reçu), badge inconnu, non valide, etc. : rien à faire. */
  skipped: number;
  error: string | null;
};

/**
 * Rattrapage des scans ScanHub : relit les scans depuis le dernier curseur et enregistre les présences que le
 * webhook n'a pas pu apporter (coupure, erreur, retries épuisés). Idempotent : un badge déjà pointé est ignoré.
 * Le curseur n'avance qu'après une page entièrement traitée ; une erreur inattendue l'arrête là pour réessayer.
 */
export async function reconcileScanHubScans(): Promise<ReconcileResult> {
  const result: ReconcileResult = { enabled: isScanHubEnabled(), read: 0, checkedIn: 0, skipped: 0, error: null };
  if (!result.enabled) {
    result.error = "ScanHub n'est pas configuré";
    return result;
  }

  const checkerId = await resolveScanHubCheckerId();
  if (!checkerId) {
    result.error = "Aucun compte pointeur disponible";
    return result;
  }

  const cursorRow = await db.setting.findUnique({ where: { key: CURSOR_KEY }, select: { value: true } });
  let after: string | undefined = cursorRow?.value || undefined;

  try {
    for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
      const batch = await listScans(after);
      for (const scan of batch.scans) {
        result.read += 1;
        const number = scan.qr?.externalId;
        if (scan.result !== "VALID" || !number) {
          result.skipped += 1;
          continue;
        }
        try {
          await recordBadgeCheckIn({
            badgeRef: number,
            checkedById: checkerId,
            at: scan.scannedAt ? new Date(scan.scannedAt) : undefined,
          });
          result.checkedIn += 1;
        } catch (error) {
          if (error instanceof CheckInError) result.skipped += 1;
          else throw error;
        }
      }

      if (batch.nextCursor && batch.nextCursor !== after) {
        after = batch.nextCursor;
        await db.setting.upsert({
          where: { key: CURSOR_KEY },
          create: { key: CURSOR_KEY, value: after, description: "Dernier scan ScanHub traité (rattrapage des pointages)" },
          update: { value: after },
        });
      }
      if (!batch.hasMore) break;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Erreur inconnue";
  }
  return result;
}
