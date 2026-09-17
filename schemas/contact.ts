import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Le nom est requis").max(100),
  email: z.string().trim().email("L'adresse email n'est pas valide"),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Le message doit contenir au moins 10 caractères")
    .max(5000),
  // Champ honeypot invisible : rempli uniquement par les bots.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
