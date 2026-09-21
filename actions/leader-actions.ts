"use server";

import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";

async function getConnectedUserId() {
  const result = await getUser();
  const userId = result?.user?.user?.id;
  if (!userId) throw new Error("Authentification requise");
  return userId;
}

export async function getLeaderSpaceAction() {
  const userId = await getConnectedUserId();

  const [user, activeEdition] = await Promise.all([
    db.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            city: true,
            institution: true,
            educationLevel: true,
            bio: true,
            skills: true,
            interests: true,
            region: { select: { name: true } },
          },
        },
        ambassadorApplications: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            stage: true,
            quizScore: true,
            createdAt: true,
            edition: { select: { name: true, year: true } },
            region: { select: { name: true } },
          },
        },
      },
    }),
    db.edition.findFirst({
      where: { status: EditionStatus.ACTIVE, isDeleted: false },
      select: { id: true, name: true, year: true, theme: true },
    }),
  ]);

  if (!user) throw new Error("Utilisateur introuvable");

  const profileFields = [
    user.profile?.city,
    user.profile?.institution,
    user.profile?.educationLevel,
    user.profile?.bio,
    user.profile?.region?.name,
  ];
  const profileCompletion = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100
  );

  const alreadyAppliedThisEdition = activeEdition
    ? user.ambassadorApplications.some(
        application =>
          application.edition.name === activeEdition.name &&
          application.edition.year === activeEdition.year
      )
    : false;

  return {
    user: {
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      memberSince: user.createdAt,
      profile: user.profile,
    },
    profileCompletion,
    history: user.ambassadorApplications,
    activeEdition,
    alreadyAppliedThisEdition,
  };
}
