import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Catalogue des permissions fines (§4.2/§21 du cahier des charges).
 * Le Super Admin a un accès global et n'a pas besoin d'être listé ici (bypass dans le middleware RBAC).
 * Un Admin/Staff ne reçoit QUE les permissions qui lui sont attribuées individuellement (UserPermission).
 */
const PERMISSIONS: { code: string; label: string; category: string }[] = [
  // Éditions
  {
    code: "editions.manage",
    label: "Créer et modifier les éditions",
    category: "Éditions",
  },
  {
    code: "editions.publish",
    label: "Publier / activer une édition",
    category: "Éditions",
  },
  {
    code: "editions.archive",
    label: "Archiver une édition",
    category: "Éditions",
  },

  // Utilisateurs
  {
    code: "users.manage",
    label: "Gérer les utilisateurs internes",
    category: "Utilisateurs",
  },
  {
    code: "users.permissions.manage",
    label: "Attribuer les permissions",
    category: "Utilisateurs",
  },

  // Candidatures
  {
    code: "applications.event.manage",
    label: "Gérer les candidatures Participants",
    category: "Candidatures",
  },
  {
    code: "applications.leader.manage",
    label: "Gérer les candidatures Jeunes Leaders",
    category: "Candidatures",
  },
  {
    code: "applications.ambassador.manage",
    label: "Gérer les candidatures Ambassadeurs",
    category: "Candidatures",
  },

  // Ambassadeurs
  {
    code: "regions.manage",
    label: "Gérer les régions",
    category: "Ambassadeurs",
  },
  {
    code: "quotas.manage",
    label: "Gérer les quotas régionaux",
    category: "Ambassadeurs",
  },
  {
    code: "payments.manage",
    label: "Saisir un paiement (point focal)",
    category: "Ambassadeurs",
  },
  {
    code: "payments.validate",
    label: "Valider un paiement",
    category: "Ambassadeurs",
  },
  {
    code: "training.manage",
    label: "Gérer les modules de formation",
    category: "Ambassadeurs",
  },
  { code: "quiz.manage", label: "Gérer les QCM", category: "Ambassadeurs" },
  {
    code: "ambassadors.accounts.manage",
    label: "Gérer les comptes ambassadeurs (activation, mot de passe)",
    category: "Ambassadeurs",
  },
  {
    code: "selection.manage",
    label: "Lancer et consulter la sélection",
    category: "Ambassadeurs",
  },
  {
    code: "repechage.manage",
    label: "Gérer les repêchages",
    category: "Ambassadeurs",
  },
  {
    code: "engagement.manage",
    label: "Gérer la fiche d'engagement",
    category: "Ambassadeurs",
  },
  {
    code: "boarding.manage",
    label: "Valider les embarquements",
    category: "Ambassadeurs",
  },

  // Événements
  {
    code: "program.manage",
    label: "Gérer le programme",
    category: "Événements",
  },
  {
    code: "speakers.manage",
    label: "Gérer les intervenants",
    category: "Événements",
  },
  {
    code: "partners.manage",
    label: "Gérer les partenaires",
    category: "Événements",
  },

  // Contenus
  { code: "news.manage", label: "Gérer les actualités", category: "Contenus" },
  {
    code: "media.manage",
    label: "Gérer la galerie médias",
    category: "Contenus",
  },
  {
    code: "contact.manage",
    label: "Consulter les messages de contact",
    category: "Contenus",
  },

  // Présence
  {
    code: "attendance.manage",
    label: "Pointer la présence",
    category: "Présence",
  },

  // Documents
  {
    code: "documents.manage",
    label: "Générer / consulter les documents",
    category: "Documents",
  },
  { code: "badges.manage", label: "Gérer les badges", category: "Documents" },

  // Statistiques
  {
    code: "stats.view",
    label: "Consulter les statistiques et exporter les données",
    category: "Statistiques",
  },

  // Paramètres
  {
    code: "settings.manage",
    label: "Gérer les paramètres généraux",
    category: "Paramètres",
  },
];

const REGIONS = [
  { name: "Agadez", code: "AGD" },
  { name: "Diffa", code: "DIF" },
  { name: "Dosso", code: "DOS" },
  { name: "Maradi", code: "MAR" },
  { name: "Niamey", code: "NIA" },
  { name: "Tahoua", code: "TAH" },
  { name: "Tillabéri", code: "TIL" },
  { name: "Zinder", code: "ZIN" },
];

type SeedUser = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  permissions: string[]; // codes — ignorés pour SUPER_ADMIN (accès global)
  focalRegionCode?: string; // STAFF régional — résolu en focalRegionId via REGIONS
};

/** Mot de passe partagé pour le lot de comptes de test destinés aux utilisateurs externes. */
const TEST_ACCOUNTS_PASSWORD = "JnjlTest#2026";

const STAFF_REGIONAL_PERMISSIONS = ["payments.manage", "boarding.manage", "attendance.manage"];

const USERS: SeedUser[] = [
  {
    name: "Chaibou",
    email: "chaibouabdoulwahab@gmail.com",
    role: UserRole.ADMIN,
    password: "admin@chaibou",
    permissions: PERMISSIONS.map(p => p.code), // admin historique — accès large pour continuer à tester
  },
  {
    name: "Super Admin JNJL",
    email: "superadmin@jnjl.ne",
    role: UserRole.SUPER_ADMIN,
    password: "SuperAdmin@2026",
    permissions: [],
  },
  {
    name: "Admin Éditions",
    email: "admin@jnjl.ne",
    role: UserRole.ADMIN,
    password: "Admin@2026",
    permissions: [
      "editions.manage",
      "editions.publish",
      "editions.archive",
      "news.manage",
      "contact.manage",
      "program.manage",
      "speakers.manage",
      "partners.manage",
      "media.manage",
      "applications.event.manage",
      "applications.leader.manage",
      "applications.ambassador.manage",
      "ambassadors.accounts.manage",
      "training.manage",
      "quotas.manage",
      "selection.manage",
      "repechage.manage",
      "documents.manage",
      "engagement.manage",
      "badges.manage",
      "boarding.manage",
      "attendance.manage",
      "stats.view",
    ],
  },
  {
    name: "Staff Accueil",
    email: "staff@jnjl.ne",
    role: UserRole.STAFF,
    password: "Staff@2026",
    permissions: ["attendance.manage", "applications.event.manage"],
  },
  {
    name: "Staff Point Focal",
    email: "pointfocal@jnjl.ne",
    role: UserRole.STAFF,
    password: "PointFocal@2026",
    permissions: ["payments.manage", "boarding.manage"],
  },

  // ─── Comptes de test pour utilisateurs externes (1 super admin, 2 admins, 8 staff régionaux) ───
  {
    name: "Super Admin (Test)",
    email: "test.superadmin@jnjl.ne",
    role: UserRole.SUPER_ADMIN,
    password: TEST_ACCOUNTS_PASSWORD,
    permissions: [],
  },
  {
    name: "Admin Test 1",
    email: "test.admin1@jnjl.ne",
    role: UserRole.ADMIN,
    password: TEST_ACCOUNTS_PASSWORD,
    permissions: PERMISSIONS.map(p => p.code),
  },
  {
    name: "Admin Test 2",
    email: "test.admin2@jnjl.ne",
    role: UserRole.ADMIN,
    password: TEST_ACCOUNTS_PASSWORD,
    permissions: PERMISSIONS.map(p => p.code),
  },
  ...REGIONS.map(
    (region): SeedUser => ({
      name: `Staff Régional ${region.name} (Test)`,
      email: `test.staff.${region.code.toLowerCase()}@jnjl.ne`,
      role: UserRole.STAFF,
      password: TEST_ACCOUNTS_PASSWORD,
      permissions: STAFF_REGIONAL_PERMISSIONS,
      focalRegionCode: region.code,
    })
  ),
];

async function seedPermissions() {
  console.log("Seeding permissions...");
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { label: permission.label, category: permission.category },
      create: permission,
    });
  }
  console.log(`${PERMISSIONS.length} permissions seeded.`);
}

async function seedRegions() {
  console.log("Seeding regions...");
  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name },
      create: region,
    });
  }
  console.log(`${REGIONS.length} regions seeded.`);
}

async function seedUsers() {
  console.log("Seeding users...");
  for (const seedUser of USERS) {
    let user = await prisma.user.findFirst({
      where: { email: seedUser.email },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(seedUser.password, 10);
      const focalRegion = seedUser.focalRegionCode
        ? await prisma.region.findUnique({ where: { code: seedUser.focalRegionCode } })
        : null;
      user = await prisma.user.create({
        data: {
          name: seedUser.name,
          email: seedUser.email,
          role: seedUser.role,
          emailVerified: new Date(),
          password: hashedPassword,
          focalRegionId: focalRegion?.id,
        },
      });
      console.log(`  created ${seedUser.email} (${seedUser.role})`);
    }

    // Le Super Admin a un accès global — pas de UserPermission à attribuer.
    if (
      seedUser.role === UserRole.SUPER_ADMIN ||
      seedUser.permissions.length === 0
    ) {
      continue;
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { in: seedUser.permissions } },
      select: { id: true },
    });

    for (const permission of permissions) {
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: { userId: user.id, permissionId: permission.id },
        },
        update: {},
        create: { userId: user.id, permissionId: permission.id },
      });
    }
  }
  console.log("Users seeded successfully!");
}

async function main() {
  await seedPermissions();
  await seedRegions();
  await seedUsers();
}

main()
  .catch(error => {
    console.error("Error seeding data:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
