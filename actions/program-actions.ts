"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import {
  programDaySchema,
  programSessionSchema,
  type ProgramDayInput,
  type ProgramSessionInput,
} from "@/schemas/program";

export async function listProgramDaysAction(editionId: string) {
  await requirePermission("program.manage");
  return db.programDay.findMany({
    where: { editionId },
    include: {
      sessions: {
        include: { speakers: { include: { speaker: true } } },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function createProgramDayAction(input: ProgramDayInput) {
  await requirePermission("program.manage");
  const data = programDaySchema.parse(input);

  const conflict = await db.programDay.findFirst({
    where: { editionId: data.editionId, date: new Date(data.date) },
  });
  if (conflict) throw new Error("Un jour existe déjà pour cette date");

  return db.programDay.create({
    data: {
      editionId: data.editionId,
      date: new Date(data.date),
      title: emptyToNull(data.title),
    },
  });
}

export async function deleteProgramDayAction(id: string) {
  await requirePermission("program.manage");
  await db.programDay.delete({ where: { id } });
}

export async function createProgramSessionAction(input: ProgramSessionInput) {
  await requirePermission("program.manage");
  const data = programSessionSchema.parse(input);

  const day = await db.programDay.findUnique({ where: { id: data.programDayId } });
  if (!day) throw new Error("Jour de programme introuvable");

  return db.programSession.create({
    data: {
      programDayId: data.programDayId,
      title: data.title,
      description: emptyToNull(data.description),
      type: data.type,
      startTime: combineDateTime(day.date, data.startTime),
      endTime: combineDateTime(day.date, data.endTime),
      location: emptyToNull(data.location),
      speakers: data.speakerIds.length
        ? { create: data.speakerIds.map(speakerId => ({ speakerId })) }
        : undefined,
    },
  });
}

export async function updateProgramSessionAction(
  id: string,
  input: ProgramSessionInput
) {
  await requirePermission("program.manage");
  const data = programSessionSchema.parse(input);

  const day = await db.programDay.findUnique({ where: { id: data.programDayId } });
  if (!day) throw new Error("Jour de programme introuvable");

  return db.$transaction(async transaction => {
    await transaction.sessionSpeaker.deleteMany({ where: { sessionId: id } });
    return transaction.programSession.update({
      where: { id },
      data: {
        programDayId: data.programDayId,
        title: data.title,
        description: emptyToNull(data.description),
        type: data.type,
        startTime: combineDateTime(day.date, data.startTime),
        endTime: combineDateTime(day.date, data.endTime),
        location: emptyToNull(data.location),
        speakers: data.speakerIds.length
          ? { create: data.speakerIds.map(speakerId => ({ speakerId })) }
          : undefined,
      },
    });
  });
}

export async function deleteProgramSessionAction(id: string) {
  await requirePermission("program.manage");
  await db.programSession.delete({ where: { id } });
}

function combineDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

// ─────────────────────────────────────────────────────────────
// Lecture publique
// ─────────────────────────────────────────────────────────────

export async function listActiveEditionProgramAction() {
  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return [];

  return db.programDay.findMany({
    where: { editionId: edition.id },
    include: {
      sessions: {
        include: { speakers: { include: { speaker: true } } },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      },
    },
    orderBy: { date: "asc" },
  });
}
