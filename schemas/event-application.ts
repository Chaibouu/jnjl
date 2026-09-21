import { z } from "zod";
import { GENDER_VALUES } from "@/lib/gender";

export const eventApplicationSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est requis").max(100),
  lastName: z.string().trim().min(2, "Le nom est requis").max(100),
  email: z.string().trim().email("L'adresse email n'est pas valide"),
  phone: z.string().trim().min(8, "Le téléphone est requis").max(30),
  gender: z.enum(GENDER_VALUES, {
    errorMap: () => ({ message: "Le sexe est requis (Masculin ou Féminin)" }),
  }),
  regionId: z.string().trim().max(50).optional().or(z.literal("")),
  motivation: z.string().trim().max(1000).optional().or(z.literal("")),
  consent: z.boolean().refine(value => value === true, {
    message: "Le consentement est requis",
  }),
});

export type EventApplicationInput = z.infer<typeof eventApplicationSchema>;
