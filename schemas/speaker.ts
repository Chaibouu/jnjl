import { z } from "zod";

export const speakerSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est requis").max(100),
  lastName: z.string().trim().min(2, "Le nom est requis").max(100),
  photo: z.string().trim().max(2000).optional().or(z.literal("")),
  role: z.string().trim().max(150).optional().or(z.literal("")),
  organization: z.string().trim().max(150).optional().or(z.literal("")),
  bio: z.string().trim().max(3000).optional().or(z.literal("")),
  editionId: z.string().trim().optional().or(z.literal("")),
});

export type SpeakerInput = z.infer<typeof speakerSchema>;
