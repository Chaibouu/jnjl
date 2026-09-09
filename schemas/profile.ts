import { z } from "zod";

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100),
  firstName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  institution: z.string().trim().max(150).optional().or(z.literal("")),
  educationLevel: z.string().trim().max(100).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  skills: z.array(z.string().trim().min(1).max(80)).max(30),
  interests: z.array(z.string().trim().min(1).max(80)).max(30),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
    newPassword: z
      .string()
      .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères")
      .max(128),
    confirmPassword: z.string().min(1, "La confirmation est requise"),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
