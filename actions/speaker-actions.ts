"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { speakerSchema, type SpeakerInput } from "@/schemas/speaker";

export async function listSpeakersAction() {
  await requirePermission("speakers.manage");
  return db.speaker.findMany({
    where: { isDeleted: false },
    include: {
      editions: {
        include: { edition: { select: { id: true, name: true, year: true } } },
      },
    },
    orderBy: { lastName: "asc" },
  });
}

export async function getSpeakerAction(id: string) {
  await requirePermission("speakers.manage");
  const speaker = await db.speaker.findFirst({
    where: { id, isDeleted: false },
    include: { editions: true },
  });
  if (!speaker) throw new Error("Intervenant introuvable");
  return speaker;
}

export async function createSpeakerAction(input: SpeakerInput) {
  await requirePermission("speakers.manage");
  const data = speakerSchema.parse(input);

  return db.speaker.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      photo: emptyToNull(data.photo),
      role: emptyToNull(data.role),
      organization: emptyToNull(data.organization),
      bio: emptyToNull(data.bio),
      editions: data.editionId
        ? { create: { editionId: data.editionId } }
        : undefined,
    },
  });
}

export async function updateSpeakerAction(id: string, input: SpeakerInput) {
  await requirePermission("speakers.manage");
  const data = speakerSchema.parse(input);

  const existing = await db.speaker.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new Error("Intervenant introuvable");

  return db.$transaction(async transaction => {
    await transaction.editionSpeaker.deleteMany({ where: { speakerId: id } });
    return transaction.speaker.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        photo: emptyToNull(data.photo),
        role: emptyToNull(data.role),
        organization: emptyToNull(data.organization),
        bio: emptyToNull(data.bio),
        editions: data.editionId
          ? { create: { editionId: data.editionId } }
          : undefined,
      },
    });
  });
}

export async function deleteSpeakerAction(id: string) {
  await requirePermission("speakers.manage");
  await db.speaker.update({ where: { id }, data: { isDeleted: true } });
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

// ─────────────────────────────────────────────────────────────
// Lecture publique
// ─────────────────────────────────────────────────────────────

export async function listActiveEditionSpeakersAction() {
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return [];

  const links = await db.editionSpeaker.findMany({
    where: { editionId: edition.id, speaker: { isDeleted: false } },
    include: { speaker: true },
  });
  return links.map(link => link.speaker);
}
