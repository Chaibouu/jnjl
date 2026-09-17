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

export async function getCurrentProfileAction() {
  const userId = await getConnectedUserId();
  const user = await db.user.findUnique({
    where: { id: userId, isDeleted: false },
    select: profileSelect,
  });
  if (!user) throw new Error("Utilisateur introuvable");
  return user;
}

export async function updateCurrentProfileAction(input: ProfileInput) {
  const userId = await getConnectedUserId();
  const data = profileSchema.parse(input);
  return db.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      firstName: emptyToNull(data.firstName),
      lastName: emptyToNull(data.lastName),
      profile: {
        upsert: {
          create: profileData(data),
          update: profileData(data),
        },
      },
    },
    select: profileSelect,
  });
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
