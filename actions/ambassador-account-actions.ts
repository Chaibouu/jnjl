"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import {
  setAmbassadorPasswordSchema,
  type SetAmbassadorPasswordInput,
} from "@/schemas/ambassador-account";

const accountInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      emailVerified: true,
      isTwoFactorEnabled: true,
      deactivatedAt: true,
    },
  },
  region: { select: { id: true, name: true, code: true } },
  edition: { select: { id: true, name: true, year: true } },
} as const;

export async function listAmbassadorAccountsAction() {
  await requirePermission("ambassadors.accounts.manage");
  const applications = await db.ambassadorApplication.findMany({
    where: { userId: { not: null }, user: { isDeleted: false } },
    include: accountInclude,
    orderBy: { createdAt: "desc" },
  });
  return applications.filter(
    (application): application is typeof application & {
      user: NonNullable<(typeof application)["user"]>;
    } => application.user !== null
  );
}

async function getManagedAmbassadorUser(userId: string) {
  const application = await db.ambassadorApplication.findFirst({
    where: { userId },
    include: { user: true },
  });
  if (!application?.user || application.user.isDeleted) {
    throw new Error("Compte ambassadeur introuvable");
  }
  return application.user;
}

export async function toggleAmbassadorAccountAction(userId: string) {
  await requirePermission("ambassadors.accounts.manage");
  const target = await getManagedAmbassadorUser(userId);

  const user = await db.user.update({
    where: { id: userId },
    data: {
      isActive: !target.isActive,
      deactivatedAt: target.isActive ? new Date() : null,
    },
    select: {
      id: true,
      isActive: true,
      deactivatedAt: true,
    },
  });

  if (target.isActive) {
    await db.session.deleteMany({ where: { userId } });
  }
  return user;
}

export async function setAmbassadorPasswordAction(
  userId: string,
  input: SetAmbassadorPasswordInput
) {
  await requirePermission("ambassadors.accounts.manage");
  await getManagedAmbassadorUser(userId);
  const data = setAmbassadorPasswordSchema.parse(input);

  await db.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(data.password, 12) },
  });
  await db.session.deleteMany({ where: { userId } });

  return { id: userId };
}

export async function sendAmbassadorPasswordResetAction(userId: string) {
  await requirePermission("ambassadors.accounts.manage");
  const target = await getManagedAmbassadorUser(userId);
  if (!target.email) throw new Error("Ce compte n'a pas d'adresse email");

  const resetToken = await generatePasswordResetToken(target.email);
  await sendPasswordResetEmail(target.email, resetToken);
  return { id: userId };
}
