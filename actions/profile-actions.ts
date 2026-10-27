"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import {
  passwordChangeSchema,
  profileSchema,
  type PasswordChangeInput,
  type ProfileInput,
} from "@/schemas/profile";

const profileSelect = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  image: true,
  isActive: true,
  emailVerified: true,
  isTwoFactorEnabled: true,
  profile: {
    select: {
      city: true,
      institution: true,
      educationLevel: true,
      bio: true,
      skills: true,
      interests: true,
      updatedAt: true,
    },
  },
} as const;

async function getConnectedUserId() {
  const result = await getUser();
  const userId = result?.user?.user?.id;
  if (!userId) throw new Error("Authentification requise");
  return userId;
}

/**
 * Identité officielle d'un ambassadeur : le nom saisi à sa candidature. C'est celui qui figure sur ses documents
 * (attestations, engagement, badge) ; il ne se modifie pas depuis le profil, sinon on pourrait faire éditer des
 * documents au nom de quelqu'un d'autre. Null pour un compte sans candidature ambassadeur.
 */
async function getOfficialIdentity(userId: string) {
  const application = await db.ambassadorApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { firstName: true, lastName: true },
  });
  if (!application) return null;
  return {
    firstName: application.firstName,
    lastName: application.lastName,
    name: `${application.firstName} ${application.lastName}`.trim(),
  };
}

export async function getCurrentProfileAction() {
  const userId = await getConnectedUserId();
  const user = await db.user.findUnique({
    where: { id: userId, isDeleted: false },
    select: profileSelect,
  });
  if (!user) throw new Error("Utilisateur introuvable");
  const identity = await getOfficialIdentity(userId);
  // Ambassadeur : on affiche toujours le nom officiel de la candidature, verrouillé.
  return { ...user, ...(identity ?? {}), nameLocked: !!identity };
}

export async function updateCurrentProfileAction(input: ProfileInput) {
  const userId = await getConnectedUserId();
  const data = profileSchema.parse(input);
  const identity = await getOfficialIdentity(userId);
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      // Ambassadeur : le nom reste celui de la candidature (le formulaire ne peut pas le changer).
      name: identity?.name ?? data.name,
      firstName: identity ? identity.firstName : emptyToNull(data.firstName),
      lastName: identity ? identity.lastName : emptyToNull(data.lastName),
      profile: {
        upsert: {
          create: profileData(data),
          update: profileData(data),
        },
      },
    },
    select: profileSelect,
  });
  return { ...updated, nameLocked: !!identity };
}

export async function changeCurrentPasswordAction(input: PasswordChangeInput) {
  const userId = await getConnectedUserId();
  const data = passwordChangeSchema.parse(input);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user?.password)
    throw new Error("Ce compte ne possède pas de mot de passe local");
  if (!(await bcrypt.compare(data.currentPassword, user.password))) {
    throw new Error("Le mot de passe actuel est incorrect");
  }

  await db.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(data.newPassword, 12) },
  });
  return { success: true };
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

function profileData(data: ProfileInput) {
  return {
    city: emptyToNull(data.city),
    institution: emptyToNull(data.institution),
    educationLevel: emptyToNull(data.educationLevel),
    bio: emptyToNull(data.bio),
    skills: data.skills.filter(Boolean),
    interests: data.interests.filter(Boolean),
  };
}
