import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const editionSchema = z.object({
  year: z.coerce
    .number()
    .int("L'année doit être un nombre entier")
    .min(2000, "Année invalide")
    .max(2100, "Année invalide"),
  name: z.string().trim().min(2, "Le nom est requis").max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Le slug est requis")
    .max(150)
    .regex(
      slugRegex,
      "Le slug ne peut contenir que des minuscules, chiffres et tirets"
    ),
  theme: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  // Chaînes ISO (yyyy-mm-dd) issues d'un <input type="date"> — converties en Date dans l'action.
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
});

export type EditionInput = z.infer<typeof editionSchema>;
