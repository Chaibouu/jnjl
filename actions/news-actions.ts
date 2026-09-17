"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { newsSchema, type NewsInput } from "@/schemas/news";

export async function listNewsAction() {
  await requirePermission("news.manage");
  return db.news.findMany({
    where: { isDeleted: false },
    include: { edition: { select: { id: true, name: true, year: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNewsAction(id: string) {
  await requirePermission("news.manage");
  const news = await db.news.findFirst({ where: { id, isDeleted: false } });
  if (!news) throw new Error("Actualité introuvable");
  return news;
}

export async function createNewsAction(input: NewsInput) {
  await requirePermission("news.manage");
  const data = newsSchema.parse(input);
  await assertUniqueSlug(data.slug);

  return db.news.create({
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: emptyToNull(data.excerpt),
      content: data.content,
      category: emptyToNull(data.category),
      coverImage: emptyToNull(data.coverImage),
      editionId: emptyToNull(data.editionId),
      isPublished: data.isPublished,
      publishedAt: data.isPublished ? new Date() : null,
    },
  });
}

export async function updateNewsAction(id: string, input: NewsInput) {
  await requirePermission("news.manage");
  const data = newsSchema.parse(input);

  const existing = await db.news.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new Error("Actualité introuvable");

  await assertUniqueSlug(data.slug, id);

  return db.news.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: emptyToNull(data.excerpt),
      content: data.content,
      category: emptyToNull(data.category),
      coverImage: emptyToNull(data.coverImage),
      editionId: emptyToNull(data.editionId),
      isPublished: data.isPublished,
      publishedAt:
        data.isPublished && !existing.isPublished
          ? new Date()
          : data.isPublished
            ? existing.publishedAt
            : null,
    },
  });
}

export async function deleteNewsAction(id: string) {
  await requirePermission("news.manage");
  await db.news.update({ where: { id }, data: { isDeleted: true } });
}

async function assertUniqueSlug(slug: string, excludeId?: string) {
  const conflict = await db.news.findFirst({
    where: { slug, isDeleted: false, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  if (conflict) throw new Error("Ce slug est déjà utilisé par une autre actualité");
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

// ─────────────────────────────────────────────────────────────
// Lecture publique
// ─────────────────────────────────────────────────────────────

export async function listPublishedNewsAction(limit?: number) {
  return db.news.findMany({
    where: { isDeleted: false, isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function getPublishedNewsBySlugAction(slug: string) {
  const news = await db.news.findFirst({
    where: { slug, isDeleted: false, isPublished: true },
    include: { edition: { select: { name: true, year: true } } },
  });
  if (!news) throw new Error("Actualité introuvable");
  return news;
}
