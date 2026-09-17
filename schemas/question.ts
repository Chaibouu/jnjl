import { z } from "zod";

export const questionTypes = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] as const;

export const questionOptionSchema = z.object({
  text: z.string().trim().min(1, "Le texte de la réponse est requis").max(300),
  isCorrect: z.boolean().default(false),
});

export const questionSchema = z
  .object({
    categoryId: z.string().trim().min(1, "La catégorie est requise"),
    type: z.enum(questionTypes).default("SINGLE_CHOICE"),
    text: z.string().trim().min(5, "La question est requise"),
    explanation: z.string().trim().max(1000).optional().or(z.literal("")),
    points: z.coerce.number().int().min(1, "Au moins 1 point").max(100),
    isActive: z.boolean().default(true),
    options: z
      .array(questionOptionSchema)
      .min(2, "Au moins 2 réponses sont requises"),
  })
  .superRefine((data, ctx) => {
    const correctCount = data.options.filter(option => option.isCorrect).length;
    if (correctCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sélectionnez au moins une bonne réponse",
        path: ["options"],
      });
    }
    if (data.type !== "MULTIPLE_CHOICE" && correctCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Une seule bonne réponse est autorisée pour ce type de question",
        path: ["options"],
      });
    }
    if (data.type === "TRUE_FALSE" && data.options.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Une question Vrai/Faux doit avoir exactement 2 réponses",
        path: ["options"],
      });
    }
  });

export type QuestionInput = z.infer<typeof questionSchema>;
