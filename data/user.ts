import { db } from "@/lib/db";

export const getUserByEmail = async (email: string) => {
  try {
    const user = await db.user.findUnique({ where: { email } });

    return user;
  } catch {
    return null;
  }
};

// export const getUserById = async (id: string) => {
//   try {
//     const user = await db.user.findUnique({ where: { id } });

//     return user;
//   } catch {
//     return null;
//   }
// };

export async function getAllUsers() {
  try {
    return await db.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        image: true,
      },
      orderBy: { role: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getUserById(userId: string) {
  try {
    // Récupérer les informations de l'utilisateur depuis la base de données
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        image: true,
        permissions: { select: { permission: { select: { code: true } } } },
        _count: { select: { ambassadorApplications: true } },
      },
    });

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    const { permissions, _count, ...rest } = user;
    return {
      ...rest,
      hasAmbassadorApplication: _count.ambassadorApplications > 0,
      // Le Super Admin a un accès global : pas besoin de lister ses permissions (lib/permissions.ts).
      permissions: permissions.map((p) => p.permission.code),
    };
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
}
