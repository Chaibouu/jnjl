"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { ForbiddenError } from "@/lib/forbidden-error";
import type { User } from "@/types/user";

async function getCurrentUser(): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  return user;
}

export async function listMyNotificationsAction() {
  const user = await getCurrentUser();
  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function countMyUnreadNotificationsAction() {
  const user = await getCurrentUser();
  return db.notification.count({ where: { userId: user.id, isRead: false } });
}

export async function markNotificationReadAction(id: string) {
  const user = await getCurrentUser();
  // Le filtre userId empêche de marquer la notification d'un autre utilisateur.
  await db.notification.updateMany({
    where: { id, userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
}
