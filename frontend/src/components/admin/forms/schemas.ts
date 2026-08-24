import { z } from "zod";

const intField = (min = 0, max?: number) => {
  let schema = z.number().int().min(min);
  if (max !== undefined) schema = schema.max(max);
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const n = typeof val === "number" ? val : Number(val);
    return Number.isFinite(n) ? n : val;
  }, schema);
};

export const moduleFormSchema = z.object({
  title: z.string().trim().min(2, "Titre trop court").max(255),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  orderIndex: intField(0),
  published: z.boolean(),
  yearNumber: intField(1, 2),
  ufCode: z.string().trim().min(1, "UF requise").max(20),
  ufTitle: z.string().trim().min(2, "Titre UF trop court").max(255),
});

export type ModuleFormValues = z.output<typeof moduleFormSchema>;

export const lessonFormSchema = z.object({
  title: z.string().trim().min(2, "Titre trop court").max(255),
  orderIndex: intField(0),
  published: z.boolean(),
});

export type LessonFormValues = z.output<typeof lessonFormSchema>;

export const quizSettingsSchema = z
  .object({
    title: z.string().trim().min(2).max(255),
    quizType: z.enum(["APPLICATIF", "FIN_MODULE", "FIN_UF", "FIN_ANNEE"]),
    moduleId: z.string().uuid().optional().or(z.literal("")),
    lessonId: z.string().uuid().optional().or(z.literal("")),
    ufCode: z.string().trim().optional().or(z.literal("")),
    yearNumber: intField(1, 2).optional(),
    passingScore: intField(0, 100),
    maxAttempts: intField(1, 20),
    timeLimitSeconds: intField(0),
    randomizeQuestions: z.boolean(),
    randomizeOptions: z.boolean(),
    retryDelayHours: intField(0, 168),
    blocking: z.boolean(),
    published: z.boolean(),
    proctoringEnabled: z.boolean(),
    focusLossDetection: z.boolean(),
    copyProtection: z.boolean(),
    lockdownMode: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.quizType === "FIN_MODULE" && !data.moduleId) {
      ctx.addIssue({
        code: "custom",
        message: "Sélectionnez un module",
        path: ["moduleId"],
      });
    }
    if (data.quizType === "APPLICATIF") {
      if (!data.moduleId) {
        ctx.addIssue({
          code: "custom",
          message: "Sélectionnez un module",
          path: ["moduleId"],
        });
      }
      if (!data.lessonId) {
        ctx.addIssue({
          code: "custom",
          message: "Sélectionnez une section",
          path: ["lessonId"],
        });
      }
    }
    if (data.quizType === "FIN_UF" && !data.ufCode) {
      ctx.addIssue({ code: "custom", message: "Sélectionnez une UF", path: ["ufCode"] });
    }
    if (data.quizType === "FIN_ANNEE" && !data.yearNumber) {
      ctx.addIssue({ code: "custom", message: "Sélectionnez une année", path: ["yearNumber"] });
    }
  });

export type QuizSettingsValues = z.output<typeof quizSettingsSchema>;

export const questionOptionSchema = z.object({
  label: z.string().trim().min(1, "Option vide"),
  correct: z.boolean(),
  orderIndex: intField(0),
});

export const questionFormSchema = z
  .object({
    prompt: z.string().trim().min(3, "Énoncé trop court"),
    questionType: z.enum(["SINGLE_CHOICE", "MULTI_CHOICE", "TRUE_FALSE", "ESSAY"]),
    explanation: z.string().trim().optional().or(z.literal("")),
    imageAssetId: z.string().uuid().optional().nullable().or(z.literal("")),
    options: z.array(questionOptionSchema),
    essayMaxLength: intField(0).optional(),
  })
  .superRefine((data, ctx) => {
    const correct = data.options.filter((o) => o.correct).length;
    if (data.questionType === "MULTI_CHOICE" && data.options.length < 2) {
      ctx.addIssue({ code: "custom", message: "Au moins 2 options", path: ["options"] });
    }
    if (data.questionType === "MULTI_CHOICE" && correct < 1) {
      ctx.addIssue({ code: "custom", message: "Au moins une bonne réponse", path: ["options"] });
    }
    if (
      (data.questionType === "SINGLE_CHOICE" || data.questionType === "TRUE_FALSE") &&
      correct !== 1
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Exactement une bonne réponse requise",
        path: ["options"],
      });
    }
  });

export type QuestionFormValues = z.output<typeof questionFormSchema>;

export const quizDefaultsSchema = z.object({
  defaultSectionPassingScore: intField(0, 100),
  defaultModulePassingScore: intField(0, 100),
  defaultModuleMaxAttempts: intField(1, 20),
  defaultModuleTimeLimitSeconds: intField(0),
  defaultRetryDelayHours: intField(0, 168),
  sectionCompletionVideoPercent: intField(1, 100),
});

export type QuizDefaultsValues = z.output<typeof quizDefaultsSchema>;
