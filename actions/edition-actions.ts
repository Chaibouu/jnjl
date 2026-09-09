"use server";

import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { editionSchema, type EditionInput } from "@/schemas/edition";

/**
 * §2.1 — Créer/modifier une édition. Le statut (DRAFT/PUBLISHED/ACTIVE/ARCHIVED)
 * n'est volontairement PAS modifiable ici : l'activation (une seule édition ACTIVE
 * à la fois, Règle 6) et l'archivage sont des actions dédiées (modules 2.2/2.3)
 * qui portent leur propre invariant transactionnel.
 */

export async function listEditionsAction() {
  await requirePermission("editions.manage");
  return db.edition.findMany({
    where: { isDeleted: false },
    orderBy: { year: "desc" },
  });
}

export async function getEditionAction(id: string) {
  await requirePermission("editions.manage");
  const edition = await db.edition.findFirst({
    where: { id, isDeleted: false },
  });
  if (!edition) throw new Error("Édition introuvable");
  return edition;
}

export async function createEditionAction(input: EditionInput) {
  await requirePermission("editions.manage");
  const data = editionSchema.parse(input);
  await assertUnique(data);

  return db.edition.create({
    data: {
      year: data.year,
      name: data.name,
      slug: data.slug,
      theme: emptyToNull(data.theme),
      description: emptyToNull(data.description),
      location: emptyToNull(data.location),
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
    },
  });
}

export async function updateEditionAction(id: string, input: EditionInput) {
  await requirePermission("editions.manage");
  const data = editionSchema.parse(input);

  const existing = await db.edition.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new Error("Édition introuvable");

  await assertUnique(data, id);

  return db.edition.update({
    where: { id },
    data: {
      year: data.year,
      name: data.name,
      slug: data.slug,
      theme: emptyToNull(data.theme),
      description: emptyToNull(data.description),
      location: emptyToNull(data.location),
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
    },
  });
}

/** Active une édition et désactive l'édition active précédente dans la même transaction. */
export async function activateEditionAction(id: string) {
  await requirePermission("editions.publish");

  const edition = await db.edition.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, status: true },
  });
  if (!edition) throw new Error("Édition introuvable");
  if (edition.status === EditionStatus.ACTIVE) return edition;

  return db.$transaction(
    async transaction => {
      await transaction.edition.updateMany({
        where: {
          status: EditionStatus.ACTIVE,
          isDeleted: false,
          NOT: { id },
        },
        data: { status: EditionStatus.PUBLISHED },
      });

      return transaction.edition.update({
        where: { id },
        data: { status: EditionStatus.ACTIVE },
      });
    },
    { isolationLevel: "Serializable" }
  );
}

async function assertUnique(data: EditionInput, excludeId?: string) {
  const notClause = excludeId ? { NOT: { id: excludeId } } : {};

  const yearConflict = await db.edition.findFirst({
    where: { year: data.year, isDeleted: false, ...notClause },
  });
  if (yearConflict) {
    throw new Error("Une édition existe déjà pour cette année");
  }

  const slugConflict = await db.edition.findFirst({
    where: { slug: data.slug, isDeleted: false, ...notClause },
  });
  if (slugConflict) {
    throw new Error("Ce slug est déjà utilisé par une autre édition");
  }
}

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}
