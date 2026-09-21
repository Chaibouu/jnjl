"use server";

import { revalidatePath } from "next/cache";
import { EditionStatus, MediaType } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";

// ─────────────────────────────────────────────────────────────
// Chiffres clés (administration)
// ─────────────────────────────────────────────────────────────

export async function listEditionStatsAction(editionId: string) {
  await requirePermission("editions.manage");
  return db.editionStat.findMany({ where: { editionId }, orderBy: { order: "asc" } });
}

export async function saveEditionStatAction(input: {
  id?: string;
  editionId: string;
  label: string;
  value: number;
}) {
  await requirePermission("editions.manage");

  const label = input.label.trim();
  if (!label) throw new Error("Le libellé est requis");
  if (!Number.isInteger(input.value) || input.value < 0) {
    throw new Error("La valeur doit être un entier positif");
  }

  if (input.id) {
    const existing = await db.editionStat.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error("Chiffre introuvable");
    await db.editionStat.update({ where: { id: input.id }, data: { label, value: input.value } });
  } else {
    const duplicate = await db.editionStat.findUnique({
      where: { editionId_label: { editionId: input.editionId, label } },
    });
    if (duplicate) throw new Error("Un chiffre avec ce libellé existe déjà pour cette édition");
    const last = await db.editionStat.findFirst({
      where: { editionId: input.editionId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    await db.editionStat.create({
      data: { editionId: input.editionId, label, value: input.value, order: (last?.order ?? -1) + 1 },
    });
  }

  revalidatePath("/");
  revalidatePath("/editions");
}

export async function deleteEditionStatAction(id: string) {
  await requirePermission("editions.manage");
  await db.editionStat.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/editions");
}

// ─────────────────────────────────────────────────────────────
// Médias (administration)
// ─────────────────────────────────────────────────────────────

export async function listEditionMediaAction(editionId: string) {
  await requirePermission("media.manage");
  return db.media.findMany({ where: { editionId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
}

export async function addEditionMediaAction(input: {
  editionId: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  caption?: string;
}) {
  await requirePermission("media.manage");

  const url = input.url.trim();
  if (!/^(https?:\/\/|\/)/i.test(url)) {
    throw new Error("L'URL doit commencer par http(s):// ou /");
  }
  if (!Object.values(MediaType).includes(input.type)) throw new Error("Type de média invalide");

  const last = await db.media.findFirst({
    where: { editionId: input.editionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await db.media.create({
    data: {
      editionId: input.editionId,
      type: input.type,
      url,
      caption: input.caption?.trim() || null,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath("/editions");
}

export async function deleteEditionMediaAction(id: string) {
  await requirePermission("media.manage");
  await db.media.delete({ where: { id } });
  revalidatePath("/editions");
}

// ─────────────────────────────────────────────────────────────
// Lecture publique — éditions passées
// ─────────────────────────────────────────────────────────────

/** Éditions terminées (archivées), de la plus récente à la plus ancienne. */
export async function listPastEditionsAction() {
  return db.edition.findMany({
    where: { status: EditionStatus.ARCHIVED, isDeleted: false },
    orderBy: { year: "desc" },
    select: {
      id: true,
      year: true,
      name: true,
      slug: true,
      theme: true,
      location: true,
      startDate: true,
      endDate: true,
      stats: { orderBy: { order: "asc" }, select: { id: true, label: true, value: true } },
      media: { where: { type: MediaType.PHOTO }, orderBy: { order: "asc" }, take: 1, select: { url: true } },
    },
  });
}

export async function getPastEditionBySlugAction(slug: string) {
  return db.edition.findFirst({
    where: { slug, status: EditionStatus.ARCHIVED, isDeleted: false },
    include: {
      stats: { orderBy: { order: "asc" } },
      media: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
}
