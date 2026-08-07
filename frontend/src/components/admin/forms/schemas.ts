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
    quizType: z.enum(["APPLICATIF", "FIN_MODULE"]),
    moduleId: z.string().uuid().optional().or(z.literal("")),
    lessonId: z.string().uuid().optional().or(z.literal("")),
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
    drawFromBankId: z.string().uuid().optional().or(z.literal("")),
    drawCount: intField(0).optional(),
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
  });

export type QuizSettingsValues = z.output<typeof quizSettingsSchema>;

export const questionOptionSchema = z.object({
  label: z.string().trim().min(1, "Option vide"),
  correct: z.boolean(),
  orderIndex: intField(0),
});

export const matchingPairSchema = z.object({
  left: z.string().trim().min(1, "Élément gauche vide"),
  right: z.string().trim().min(1, "Élément droit vide"),
});

export const hotspotZoneSchema = z.object({
  x: intField(0, 100),
  y: intField(0, 100),
  width: intField(1, 100),
  height: intField(1, 100),
});

export const questionFormSchema = z
  .object({
    prompt: z.string().trim().min(3, "Énoncé trop court"),
    questionType: z.enum([
      "SINGLE_CHOICE",
      "MULTI_CHOICE",
      "TRUE_FALSE",
      "MATCHING",
      "HOTSPOT",
      "FILL_BLANK",
      "ESSAY",
    ]),
    orderIndex: intField(0),
    explanation: z.string().trim().optional().or(z.literal("")),
    imageAssetId: z.string().uuid().optional().nullable().or(z.literal("")),
    options: z.array(questionOptionSchema),
    matchingPairs: z.array(matchingPairSchema),
    hotspotZones: z.array(hotspotZoneSchema),
    fillBlankTemplate: z.string().trim().optional().or(z.literal("")),
    fillBlankAcceptedAnswers: z.string().trim().optional().or(z.literal("")),
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
    if (data.questionType === "MATCHING" && data.matchingPairs.length < 2) {
      ctx.addIssue({ code: "custom", message: "Au moins 2 paires", path: ["matchingPairs"] });
    }
    if (data.questionType === "HOTSPOT") {
      if (!data.imageAssetId) {
        ctx.addIssue({ code: "custom", message: "Image requise pour le hotspot", path: ["imageAssetId"] });
      }
      if (data.hotspotZones.length < 1) {
        ctx.addIssue({ code: "custom", message: "Au moins une zone cible", path: ["hotspotZones"] });
      }
    }
    if (data.questionType === "FILL_BLANK") {
      if (!data.fillBlankTemplate) {
        ctx.addIssue({ code: "custom", message: "Modèle de phrase requis", path: ["fillBlankTemplate"] });
      }
      if (!data.fillBlankAcceptedAnswers) {
        ctx.addIssue({ code: "custom", message: "Au moins une réponse acceptée", path: ["fillBlankAcceptedAnswers"] });
      }
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
