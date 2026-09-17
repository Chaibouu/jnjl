import { z } from "zod";

export const sessionTypes = [
  "CONFERENCE",
  "PANEL",
  "ATELIER",
  "CEREMONIE",
  "AUTRE",
] as const;

export const programDaySchema = z.object({
  editionId: z.string().trim().min(1, "L'édition est requise"),
  date: z.string().trim().min(1, "La date est requise"),
  title: z.string().trim().max(150).optional().or(z.literal("")),
});

export type ProgramDayInput = z.infer<typeof programDaySchema>;

export const programSessionSchema = z.object({
  programDayId: z.string().trim().min(1, "Le jour est requis"),
  title: z.string().trim().min(2, "Le titre est requis").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: z.enum(sessionTypes).default("CONFERENCE"),
  startTime: z.string().trim().min(1, "L'heure de début est requise"),
  endTime: z.string().trim().min(1, "L'heure de fin est requise"),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  speakerIds: z.array(z.string()).default([]),
});

export type ProgramSessionInput = z.infer<typeof programSessionSchema>;
