import { z } from "zod";

export const partnerCategories = [
  "INSTITUTIONNEL",
  "TECHNIQUE",
  "FINANCIER",
  "MEDIA",
  "AUTRE",
] as const;

export const partnerSchema = z.object({
  name: z.string().trim().min(2, "Le nom est requis").max(150),
  logoUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().trim().max(500).optional().or(z.literal("")),
  editionId: z.string().trim().optional().or(z.literal("")),
  category: z.enum(partnerCategories).default("AUTRE"),
});

export type PartnerInput = z.infer<typeof partnerSchema>;
