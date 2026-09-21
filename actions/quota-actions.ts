"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";

export async function listRegionalQuotasAction(editionId: string) {
  await requirePermission("quotas.manage");
  const [regions, quotas] = await Promise.all([
    db.region.findMany({ orderBy: { name: "asc" } }),
    db.regionalQuota.findMany({ where: { editionId } }),
  ]);

  const quotaByRegion = new Map(quotas.map(quota => [quota.regionId, quota.quota]));

  return regions.map(region => ({
    regionId: region.id,
    regionName: region.name,
    regionCode: region.code,
    quota: quotaByRegion.get(region.id) ?? 0,
  }));
}

export async function setRegionalQuotaAction(
  editionId: string,
  regionId: string,
  quota: number
) {
  const actor = await requirePermission("quotas.manage");
  if (!Number.isInteger(quota) || quota < 0) {
    throw new Error("Le quota doit être un nombre entier positif ou nul");
  }

  await db.regionalQuota.upsert({
    where: { editionId_regionId: { editionId, regionId } },
    update: { quota, updatedById: actor.id },
    create: { editionId, regionId, quota, updatedById: actor.id },
  });

  return { regionId, quota };
}
