import { z } from "zod";

export const questionCategorySchema = z.object({
  name: z.string().trim().min(2, "Le nom est requis").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type QuestionCategoryInput = z.infer<typeof questionCategorySchema>;
