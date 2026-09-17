import { z } from "zod";

export const quizSchema = z.object({
  editionId: z.string().trim().min(1, "L'édition est requise"),
  title: z.string().trim().min(2, "Le titre est requis").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(1).max(600).optional().or(z.literal("")),
  passingScore: z.coerce.number().min(0).max(100).default(70),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showScore: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(false),
});

export type QuizInput = z.infer<typeof quizSchema>;
