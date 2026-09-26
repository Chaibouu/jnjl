"use server";

import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { getUser } from "@/actions/getUser";
import { ForbiddenError } from "@/lib/forbidden-error";
import { editionSchema, type EditionInput } from "@/schemas/edition";

/** Liste allégée réservée au peuplement de sélecteurs dans d'autres modules admin (aucune permission dédiée requise, authentification suffit). */
export async function listEditionsForSelectAction() {
  const result = await getUser();
  if (!result?.user?.user) throw new ForbiddenError("Authentification requise");

  return db.edition.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true, year: true, status: true },
    orderBy: { year: "desc" },
  });
}

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
      badgeBackgroundColor: emptyToNull(data.badgeBackgroundColor),
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
      badgeBackgroundColor: emptyToNull(data.badgeBackgroundColor),
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

/**
 * Change le statut d'une édition hors activation : archivage (édition terminée, visible dans
 * « Éditions précédentes ») ou remise en « Publiée » (brouillon ou archive restaurée).
 * L'édition active ne peut pas être archivée : il faut d'abord en activer une autre.
 */
export async function setEditionStatusAction(id: string, status: "ARCHIVED" | "PUBLISHED") {
  await requirePermission(status === "ARCHIVED" ? "editions.archive" : "editions.publish");

  const edition = await db.edition.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, status: true },
  });
  if (!edition) throw new Error("Édition introuvable");
  if (edition.status === EditionStatus.ACTIVE) {
    throw new Error("L'édition active ne peut pas être archivée : activez d'abord une autre édition");
  }

  return db.edition.update({
    where: { id },
    data: { status: status === "ARCHIVED" ? EditionStatus.ARCHIVED : EditionStatus.PUBLISHED },
    select: { id: true, status: true },
  });
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

// ─────────────────────────────────────────────────────────────
// Lecture publique
// ─────────────────────────────────────────────────────────────

export async function getActiveEditionOverviewAction() {
  const edition = await db.edition.findFirst({
    where: { status: EditionStatus.ACTIVE, isDeleted: false },
    include: { stats: { orderBy: { order: "asc" } } },
  });
  return edition;
}

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}
