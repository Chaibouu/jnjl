import { ApplicationStatus, EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AUDIENCES, EMAIL_PATTERN, type Audience, type Recipient } from "@/lib/email-audience-shared";

export { AUDIENCES };
export type { Audience, Recipient };


type Base = Exclude<Audience, "EVERYONE" | "MANUAL">;

/** Adresses uniques et valides ; le premier prénom connu est conservé. */
export function uniqueRecipients(list: { email: string | null; name: string | null }[]): Recipient[] {
  const seen = new Map<string, Recipient>();
  for (const item of list) {
    const email = item.email?.trim().toLowerCase();
    if (!email || !EMAIL_PATTERN.test(email)) continue;
    const current = seen.get(email);
    if (!current) seen.set(email, { email, name: item.name?.trim() || null });
    else if (!current.name && item.name?.trim()) current.name = item.name.trim();
  }
  return [...seen.values()];
}

/** Destinataires de chaque groupe de base, pour l'édition active et, au besoin, une région. */
export async function resolveAudiences(regionId?: string | null): Promise<Record<Base, Recipient[]>> {
  const edition = await db.edition.findFirst({
    where: { status: EditionStatus.ACTIVE, isDeleted: false },
    select: { id: true },
  });
  const editionFilter = edition ? { editionId: edition.id } : {};
  const regionFilter = regionId ? { regionId } : {};

  const applications = (statuses: ApplicationStatus[]) =>
    db.ambassadorApplication.findMany({
      where: { status: { in: statuses }, ...editionFilter, ...regionFilter },
      select: { email: true, firstName: true },
    });

  const [pending, accepted, rejected, participants, users] = await Promise.all([
    applications([ApplicationStatus.SOUMIS, ApplicationStatus.EN_COURS_ANALYSE, ApplicationStatus.LISTE_ATTENTE]),
    applications([ApplicationStatus.RETENU]),
    applications([ApplicationStatus.NON_RETENU]),
    db.eventApplication.findMany({
      where: { ...editionFilter, ...regionFilter },
      select: { email: true, firstName: true },
    }),
    db.user.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        email: { not: null },
        ...(regionId ? { profile: { regionId } } : {}),
      },
      select: { email: true, firstName: true, name: true },
    }),
  ]);

  return {
    PENDING: uniqueRecipients(pending.map(item => ({ email: item.email, name: item.firstName }))),
    ACCEPTED: uniqueRecipients(accepted.map(item => ({ email: item.email, name: item.firstName }))),
    REJECTED: uniqueRecipients(rejected.map(item => ({ email: item.email, name: item.firstName }))),
    PARTICIPANTS: uniqueRecipients(participants.map(item => ({ email: item.email, name: item.firstName }))),
    USERS: uniqueRecipients(users.map(item => ({ email: item.email, name: item.firstName || item.name?.split(" ")[0] || null }))),
  };
}

/** Liste des destinataires d'un groupe (« Tout le monde » = union dédoublonnée des autres). */
export function pickAudience(all: Record<Base, Recipient[]>, audience: Audience): Recipient[] {
  if (audience === "MANUAL") return []; // aucune liste : seules les adresses saisies à la main sont utilisées
  if (audience !== "EVERYONE") return all[audience];
  return uniqueRecipients(Object.values(all).flat().map(item => ({ email: item.email, name: item.name })));
}
