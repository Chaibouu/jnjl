"use server";

import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { auditAdminAction } from "@/lib/audit";
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  type CreateAdminUserInput,
  type UpdateAdminUserInput,
} from "@/schemas/admin-user";

const userSelect = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
  isDeleted: true,
  emailVerified: true,
  image: true,
  isTwoFactorEnabled: true,
  focalRegionId: true,
  focalRegion: { select: { id: true, name: true, code: true } },
  permissions: { select: { permission: { select: { code: true } } } },
} as const;

export async function listAdminUsersAction() {
  await requirePermission("users.manage");
  const [users, permissions, regions, deletedUsers] = await Promise.all([
    db.user.findMany({
      where: { isDeleted: false },
      select: userSelect,
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.permission.findMany({
      select: { code: true, label: true, category: true },
      orderBy: [{ category: "asc" }, { label: "asc" }],
    }),
    db.region.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { isDeleted: true },
      select: { id: true, name: true, email: true, role: true, deactivatedAt: true },
      orderBy: { deactivatedAt: "desc" },
    }),
  ]);

  return {
    users: users.map(({ permissions: userPermissions, ...user }) => ({
      ...user,
      permissions: userPermissions.map(({ permission }) => permission.code),
    })),
    permissions,
    regions,
    deletedUsers,
  };
}

export async function getAdminUserAction(userId: string) {
  await requirePermission("users.manage");
  const [user, permissions, regions] = await Promise.all([
    db.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: userSelect,
    }),
    db.permission.findMany({
      select: { code: true, label: true, category: true },
      orderBy: [{ category: "asc" }, { label: "asc" }],
    }),
    db.region.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) throw new Error("Utilisateur introuvable");
  return { user: serializeUser(user), permissions, regions };
}

export async function createAdminUserAction(input: CreateAdminUserInput) {
  const actor = await requirePermission("users.manage");
  const data = createAdminUserSchema.parse(input);
  assertCanManageRole(actor.role, data.role);
  assertPermissionsAllowed(actor.role, data.permissions);

  const email = data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) {
    throw new Error("Un utilisateur existe déjà avec cet email");
  }

  const created = await db.user.create({
    data: {
      name: data.name,
      firstName: emptyToNull(data.firstName),
      lastName: emptyToNull(data.lastName),
      email,
      password: await bcrypt.hash(data.password, 12),
      role: data.role,
      isActive: data.isActive,
      emailVerified: data.emailVerified ? new Date() : null,
      focalRegionId: data.role === UserRole.STAFF ? emptyToNull(data.focalRegionId) : null,
      permissions: { create: await permissionCreates(data.permissions) },
    },
    select: userSelect,
  });

  await auditAdminAction({
    actorId: actor.id,
    action: "USER_CREATED",
    target: { userId: created.id, label: email, role: data.role },
  });
  return serializeUser(created);
}

export async function updateAdminUserAction(
  userId: string,
  input: UpdateAdminUserInput
) {
  const actor = await requirePermission("users.manage");
  const data = updateAdminUserSchema.parse(input);
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.isDeleted) throw new Error("Utilisateur introuvable");

  assertCanManageTarget(actor.id, actor.role, target.id, target.role);
  assertCanManageRole(actor.role, data.role);
  assertPermissionsAllowed(actor.role, data.permissions);

  const updated = await db.$transaction(async transaction => {
    await transaction.userPermission.deleteMany({ where: { userId } });
    return transaction.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        firstName: emptyToNull(data.firstName),
        lastName: emptyToNull(data.lastName),
        email: data.email.toLowerCase(),
        role: data.role,
        isActive: data.isActive,
        emailVerified: data.emailVerified
          ? (target.emailVerified ?? new Date())
          : null,
        focalRegionId: data.role === UserRole.STAFF ? emptyToNull(data.focalRegionId) : null,
        ...(data.password
          ? { password: await bcrypt.hash(data.password, 12) }
          : {}),
        permissions: { create: await permissionCreates(data.permissions) },
      },
      select: userSelect,
    });
  });

  await auditAdminAction({
    actorId: actor.id,
    action: "USER_UPDATED",
    target: {
      userId,
      label: target.email,
      roleBefore: target.role,
      roleAfter: data.role,
      activeBefore: target.isActive,
      activeAfter: data.isActive,
      permissionsAfter: data.permissions.length,
      passwordChanged: Boolean(data.password),
    },
  });
  return serializeUser(updated);
}

export type UserActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function deleteAdminUserAction(userId: string): Promise<UserActionResult> {
  const actor = await requirePermission("users.manage");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.isDeleted) return { ok: false, error: "Utilisateur introuvable" };
  assertCanManageTarget(actor.id, actor.role, target.id, target.role);

  // Garde-fou : un compte lié à une candidature payée ne se supprime pas (le candidat perdrait son accès alors que
  // ses frais sont encaissés). On le désactive, ou on traite d'abord la candidature.
  const paidApplication = await db.ambassadorApplication.findFirst({
    where: { userId, payment: { is: { status: "VALIDE" } } },
    select: { id: true },
  });
  if (paidApplication) {
    return {
      ok: false,
      error:
        "Ce compte est lié à une candidature ambassadeur dont le paiement est validé : il ne peut pas être supprimé. Désactivez-le si nécessaire.",
    };
  }

  await db.user.update({
    where: { id: userId },
    data: { isDeleted: true, isActive: false, deactivatedAt: new Date() },
  });
  await db.session.deleteMany({ where: { userId } });
  await auditAdminAction({
    actorId: actor.id,
    action: "USER_DELETED",
    target: { userId, label: target.email, name: target.name, role: target.role },
  });
  return { ok: true, id: userId };
}

/** Restaure un compte supprimé (actif, non supprimé). Le mot de passe et les données sont inchangés. */
export async function restoreAdminUserAction(userId: string): Promise<UserActionResult> {
  const actor = await requirePermission("users.manage");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || !target.isDeleted) return { ok: false, error: "Ce compte n'est pas supprimé" };
  assertCanManageTarget(actor.id, actor.role, target.id, target.role);

  await db.user.update({
    where: { id: userId },
    data: { isDeleted: false, isActive: true, deactivatedAt: null },
  });
  await auditAdminAction({
    actorId: actor.id,
    action: "USER_RESTORED",
    target: { userId, label: target.email, name: target.name, role: target.role },
  });
  return { ok: true, id: userId };
}

export async function toggleAdminUserAction(userId: string) {
  const actor = await requirePermission("users.manage");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.isDeleted) throw new Error("Utilisateur introuvable");
  assertCanManageTarget(actor.id, actor.role, target.id, target.role);

  const user = await db.user.update({
    where: { id: userId },
    data: {
      isActive: !target.isActive,
      deactivatedAt: target.isActive ? new Date() : null,
    },
    select: userSelect,
  });

  if (target.isActive) {
    await db.session.deleteMany({ where: { userId } });
  }
  await auditAdminAction({
    actorId: actor.id,
    action: target.isActive ? "USER_DEACTIVATED" : "USER_ACTIVATED",
    target: { userId, label: target.email, name: target.name, role: target.role },
  });
  return serializeUser(user);
}

async function permissionCreates(codes: string[]) {
  const permissions = await db.permission.findMany({
    where: { code: { in: codes } },
    select: { id: true },
  });
  if (permissions.length !== new Set(codes).size) {
    throw new Error("Une ou plusieurs permissions sont invalides");
  }
  return permissions.map(({ id }) => ({ permissionId: id }));
}

function assertCanManageRole(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === UserRole.SUPER_ADMIN) return;
  if (
    targetRole !== UserRole.USER &&
    targetRole !== UserRole.STAFF &&
    targetRole !== UserRole.WEBMASTER
  ) {
    throw new Error("Un ADMIN ne peut gérer que les comptes USER, STAFF et WEBMASTER");
  }
}

function assertCanManageTarget(
  actorId: string,
  actorRole: UserRole,
  targetId: string,
  targetRole: UserRole
) {
  if (actorId === targetId)
    throw new Error(
      "Vous ne pouvez pas modifier ou supprimer votre propre compte ici"
    );
  assertCanManageRole(actorRole, targetRole);
}

function assertPermissionsAllowed(actorRole: UserRole, permissions: string[]) {
  if (
    actorRole !== UserRole.SUPER_ADMIN &&
    permissions.some(permission =>
      ["users.manage", "users.permissions.manage"].includes(permission)
    )
  ) {
    throw new Error(
      "Un ADMIN ne peut pas déléguer la gestion des utilisateurs"
    );
  }
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

function serializeUser(user: any) {
  const { permissions, ...result } = user;
  return {
    ...result,
    permissions: permissions.map(
      ({ permission }: { permission: { code: string } }) => permission.code
    ),
  };
}
