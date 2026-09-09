import { z } from "zod";

export const regionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Le code doit contenir au moins 2 caractères")
    .max(10, "Le code ne peut pas dépasser 10 caractères")
    .regex(
      /^[A-Z0-9-]+$/,
      "Le code ne peut contenir que des lettres, chiffres et tirets"
    ),
});

export type RegionInput = z.infer<typeof regionSchema>;
