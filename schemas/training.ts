import { z } from "zod";

export const trainingCourseSchema = z.object({
  editionId: z.string().min(1, "L'édition est requise"),
  title: z.string().trim().min(2, "Le titre est requis").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  isRequired: z.boolean(),
  hasCertificate: z.boolean(),
});

export type TrainingCourseInput = z.infer<typeof trainingCourseSchema>;

export const trainingModuleSchema = z.object({
  courseId: z.string().min(1, "La formation est requise"),
  title: z.string().trim().min(2, "Le titre est requis").max(200),
  // HTML produit par l'éditeur riche (nettoyé côté serveur avant enregistrement).
  content: z.string().trim().max(500000, "Le contenu est trop volumineux").optional().or(z.literal("")),
  videoUrl: z
    .string()
    .trim()
    .url("L'URL de la vidéo n'est pas valide")
    .max(500)
    .optional()
    .or(z.literal("")),
});

export type TrainingModuleInput = z.infer<typeof trainingModuleSchema>;
