import { z } from "zod";

export const ambassadorApplicationSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est requis").max(100),
  lastName: z.string().trim().min(2, "Le nom est requis").max(100),
  email: z.string().trim().email("L'adresse email n'est pas valide"),
  phone: z.string().trim().min(8, "Le téléphone est requis").max(30),
  gender: z.enum(["MASCULIN", "FEMININ", "AUTRE"], {
    errorMap: () => ({ message: "Le sexe est requis" }),
  }),
  birthDate: z
    .string()
    .min(1, "La date de naissance est requise")
    .refine(
      value => !Number.isNaN(new Date(value).getTime()),
      "La date de naissance est invalide"
    ),
  birthPlace: z
    .string()
    .trim()
    .min(2, "Le lieu de naissance est requis")
    .max(150),
  educationLevel: z
    .string()
    .trim()
    .min(2, "Le niveau académique est requis")
    .max(100),
  hasDisability: z.boolean(),
  disabilityDetails: z.string().trim().max(500).optional().or(z.literal("")),
  regionId: z.string().min(1, "La région est requise"),
  consent: z.boolean().refine(value => value === true, {
    message: "Le consentement est requis",
  }),
});

export type AmbassadorApplicationInput = z.infer<
  typeof ambassadorApplicationSchema
>;
