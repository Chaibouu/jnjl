"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { auditAdminAction } from "@/lib/audit";
import { BROADCAST_LINK_OPTIONS } from "@/lib/broadcast-links";
import type { User } from "@/types/user";

/**
 * Message de l'administration envoyé dans les notifications des ambassadeurs retenus de l'édition active
 * (ex. « Vos demandes de permission sont disponibles, vous pouvez les télécharger »). Réservé aux admins.
 */

async function requireAdmin(): Promise<User | null> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  return user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? user : null;
}

export async function getBroadcastContextAction() {
  if (!(await requireAdmin())) return null;
  const regions = await db.region.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return { regions };
}

export async function sendAmbassadorBroadcastAction(input: {
  title: string;
  message: string;
  link: string;
  regionId: string;
  paidOnly: boolean;
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Réservé aux administrateurs" };

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title || !message) return { ok: false, error: "Le titre et le message sont obligatoires" };
  if (title.length > 120 || message.length > 1000) return { ok: false, error: "Titre (120) ou message (1000) trop long" };
  const link = BROADCAST_LINK_OPTIONS.some(option => option.value === input.link) ? input.link : "";

  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false }, select: { id: true } });
  if (!edition) return { ok: false, error: "Aucune édition active" };

  const applications = await db.ambassadorApplication.findMany({
    where: {
      editionId: edition.id,
      status: "RETENU",
      userId: { not: null },
      ...(input.regionId ? { regionId: input.regionId } : {}),
      ...(input.paidOnly ? { payment: { is: { status: "VALIDE" } } } : {}),
    },
    select: { userId: true },
  });
  const userIds = [...new Set(applications.map(application => application.userId as string))];
  if (userIds.length === 0) return { ok: false, error: "Aucun ambassadeur ne correspond à ce ciblage" };

  await db.notification.createMany({
    data: userIds.map(userId => ({ userId, title, message, link: link || null })),
  });

  await auditAdminAction({
    actorId: admin.id,
    action: "NOTIFICATION_BROADCAST",
    target: { label: title, recipients: userIds.length, regionId: input.regionId || null, paidOnly: input.paidOnly },
  });
  revalidatePath("/dashboard/notifications");
  return { ok: true, count: userIds.length };
}
