import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const newsSchema = z.object({
  title: z.string().trim().min(2, "Le titre est requis").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Le slug est requis")
    .max(200)
    .regex(
      slugRegex,
      "Le slug ne peut contenir que des minuscules, chiffres et tirets"
    ),
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().min(10, "Le contenu est requis"),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  coverImage: z.string().trim().max(2000).optional().or(z.literal("")),
  editionId: z.string().trim().optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
});

export type NewsInput = z.infer<typeof newsSchema>;
