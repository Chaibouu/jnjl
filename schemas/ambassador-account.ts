import { z } from "zod";

export const setAmbassadorPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères"),
});

export type SetAmbassadorPasswordInput = z.infer<
  typeof setAmbassadorPasswordSchema
>;
