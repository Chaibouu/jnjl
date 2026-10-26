"use server";

import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/actions/requirePermission";
import { auditAdminAction } from "@/lib/audit";

/**
 * Changement d'adresse e-mail d'un compte par le Super Admin (ex. e-mail mal saisi à l'inscription).
 * L'adresse est aussi corrigée sur les candidatures liées au compte, pour que les e-mails partent au bon endroit.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface UserEmailRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
}

/** Recherche un compte par nom ou e-mail (15 résultats maximum). */
export async function searchUsersForEmailChangeAction(query: string): Promise<UserEmailRow[]> {
  await requireSuperAdmin();
  const term = query.trim();
  if (term.length < 2) return [];

  const users = await db.user.findMany({
    where: {
      isDeleted: false,
      OR: [
        { email: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, firstName: true, lastName: true, email: true, role: true, isActive: true, emailVerified: true },
    orderBy: { name: "asc" },
    take: 15,
  });

  return users.map(user => ({
    id: user.id,
    name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || "—",
    email: user.email ?? "",
    role: user.role,
    isActive: user.isActive,
    emailVerified: !!user.emailVerified,
  }));
}

export async function changeUserEmailAction(
  userId: string,
  newEmail: string,
  markVerified: boolean
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const actor = await requireSuperAdmin();

  const email = newEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Adresse e-mail invalide" };

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, isDeleted: true } });
  if (!target || target.isDeleted) return { ok: false, error: "Utilisateur introuvable" };
  const oldEmail = target.email ?? "";
  if (oldEmail.toLowerCase() === email) return { ok: false, error: "C'est déjà l'adresse actuelle de ce compte" };

  const taken = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, id: { not: userId } }, select: { id: true } });
  if (taken) return { ok: false, error: "Cette adresse est déjà utilisée par un autre compte" };

  try {
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { email, emailVerified: markVerified ? new Date() : null },
      }),
      db.ambassadorApplication.updateMany({ where: { userId }, data: { email } }),
      db.eventApplication.updateMany({ where: { userId }, data: { email } }),
      ...(oldEmail
        ? [
            db.verificationToken.deleteMany({ where: { email: oldEmail } }),
            db.passwordResetToken.deleteMany({ where: { email: oldEmail } }),
            db.twoFactorToken.deleteMany({ where: { email: oldEmail } }),
          ]
        : []),
    ]);
  } catch (error) {
    console.error("Changement d'e-mail impossible:", error);
    return { ok: false, error: "Le changement d'e-mail a échoué" };
  }

  await auditAdminAction({
    actorId: actor.id,
    action: "EMAIL_CHANGED",
    target: { userId, label: email, emailBefore: oldEmail, emailAfter: email, markedVerified: markVerified },
  });
  return { ok: true, email };
}
