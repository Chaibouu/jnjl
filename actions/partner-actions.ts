"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { partnerSchema, type PartnerInput } from "@/schemas/partner";

export async function listPartnersAction() {
  await requirePermission("partners.manage");
  return db.partner.findMany({
    where: { isDeleted: false },
    include: {
      editions: {
        include: { edition: { select: { id: true, name: true, year: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getPartnerAction(id: string) {
  await requirePermission("partners.manage");
  const partner = await db.partner.findFirst({
    where: { id, isDeleted: false },
    include: { editions: true },
  });
  if (!partner) throw new Error("Partenaire introuvable");
  return partner;
}

export async function createPartnerAction(input: PartnerInput) {
  await requirePermission("partners.manage");
  const data = partnerSchema.parse(input);

  return db.partner.create({
    data: {
      name: data.name,
      logoUrl: emptyToNull(data.logoUrl),
      description: emptyToNull(data.description),
      website: emptyToNull(data.website),
      editions: data.editionId
        ? {
            create: { editionId: data.editionId, category: data.category },
          }
        : undefined,
    },
  });
}

export async function updatePartnerAction(id: string, input: PartnerInput) {
  await requirePermission("partners.manage");
  const data = partnerSchema.parse(input);

  const existing = await db.partner.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new Error("Partenaire introuvable");

  return db.$transaction(async transaction => {
    await transaction.editionPartner.deleteMany({ where: { partnerId: id } });
    return transaction.partner.update({
      where: { id },
      data: {
        name: data.name,
        logoUrl: emptyToNull(data.logoUrl),
        description: emptyToNull(data.description),
        website: emptyToNull(data.website),
        editions: data.editionId
          ? {
              create: { editionId: data.editionId, category: data.category },
            }
          : undefined,
      },
    });
  });
}

export async function deletePartnerAction(id: string) {
  await requirePermission("partners.manage");
  await db.partner.update({ where: { id }, data: { isDeleted: true } });
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

// ─────────────────────────────────────────────────────────────
// Lecture publique
// ─────────────────────────────────────────────────────────────

export async function listActiveEditionPartnersAction() {
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return [];

  const links = await db.editionPartner.findMany({
    where: { editionId: edition.id, partner: { isDeleted: false } },
    include: { partner: true },
    orderBy: { order: "asc" },
  });
  return links.map(link => ({ ...link.partner, category: link.category }));
}
