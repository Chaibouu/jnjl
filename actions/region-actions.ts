"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { regionSchema, type RegionInput } from "@/schemas/region";

const regionCounts = {
  userProfiles: true,
  quotas: true,
  applications: true,
  eventApplications: true,
  boardings: true,
};

export async function listRegionsAction() {
  await requirePermission("regions.manage");
  return db.region.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: regionCounts } },
  });
}

export async function createRegionAction(input: RegionInput) {
  await requirePermission("regions.manage");
  const data = regionSchema.parse(input);

  try {
    return await db.region.create({ data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("Une région existe déjà avec ce nom ou ce code");
    }
    throw error;
  }
}

export async function updateRegionAction(id: string, input: RegionInput) {
  await requirePermission("regions.manage");
  const data = regionSchema.parse(input);

  try {
    return await db.region.update({ where: { id }, data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("Une région existe déjà avec ce nom ou ce code");
    }
    throw error;
  }
}

export async function deleteRegionAction(id: string) {
  await requirePermission("regions.manage");
  const region = await db.region.findUnique({
    where: { id },
    include: { _count: { select: regionCounts } },
  });

  if (!region) throw new Error("Région introuvable");

  const references = Object.values(region._count).reduce(
    (total, count) => total + count,
    0
  );
  if (references > 0) {
    throw new Error(
      "Cette région est déjà utilisée et ne peut pas être supprimée"
    );
  }

  await db.region.delete({ where: { id } });
  return { id };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
