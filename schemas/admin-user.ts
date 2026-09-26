import { UserRole } from "@prisma/client";
import { z } from "zod";

const optionalPassword = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(128, "Le mot de passe ne peut pas dépasser 128 caractères")
  .optional()
  .or(z.literal(""));

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(2, "Le nom est requis").max(100),
  firstName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("L'adresse email n'est pas valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  permissions: z.array(z.string().min(1)).default([]),
  /** Région à laquelle cantonner ce STAFF (point focal régional) ; ignoré pour les autres rôles. */
  focalRegionId: z.string().min(1).optional().or(z.literal("")),
});

export const updateAdminUserSchema = createAdminUserSchema
  .omit({ password: true })
  .extend({ password: optionalPassword });

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
