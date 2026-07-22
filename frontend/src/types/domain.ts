/**
 * Domain types aligned with Spring Boot API entities.
 */

export type Role = "ADMIN" | "FORMATEUR" | "ETUDIANT" | "SUPPORT";

export type BlockType = "VIDEO" | "TEXT" | "PDF" | "IMAGE";

export type QuizType = "APPLICATIF" | "FIN_MODULE";

export type QuestionType = "SINGLE_CHOICE" | "MULTI_CHOICE" | "TRUE_FALSE";

export type AttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "PASSED"
  | "FAILED";

export type ModuleLearnerStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";

export type PaymentStatus = "PENDING" | "PAID" | "EXEMPTED";

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  enabled?: boolean;
  phone?: string | null;
  cin?: string | null;
  birthDate?: string | null;
  address?: string | null;
  enrollmentYear?: number | null;
  paymentStatus?: PaymentStatus | null;
  activatedAt?: string | null;
  year2AccessEnabled?: boolean;
  avatarAssetId?: string | null;
};

export type Module = {
  id: string;
  code?: string | null;
  title: string;
  description: string | null;
  orderIndex: number;
  yearNumber?: number | null;
  ufCode?: string | null;
  ufTitle?: string | null;
  published: boolean;
  learnerStatus?: ModuleLearnerStatus;
  progressPercent?: number;
  formationId?: string;
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  orderIndex: number;
  published: boolean;
  completed?: boolean;
  blocks?: LessonBlock[];
};

export type LessonBlock = {
  id: string;
  blockType: BlockType;
  content: Record<string, unknown>;
  orderIndex: number;
};

export type Quiz = {
  id: string;
  title: string;
  quizType: QuizType;
  lessonId: string | null;
  moduleId: string | null;
  passingScore: number;
  maxAttempts: number;
  timeLimitSeconds: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  retryDelayHours: number;
  blocking: boolean;
  published: boolean;
  questionCount?: number;
};

export type AnswerOption = {
  id?: string;
  label: string;
  correct: boolean;
  orderIndex: number;
};

export type Question = {
  id: string;
  quizId?: string;
  prompt: string;
  questionType: QuestionType;
  orderIndex: number;
  explanation?: string | null;
  imageAssetId?: string | null;
  options: AnswerOption[];
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  status: AttemptStatus;
  score: number | null;
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string | null;
};

export type Certificate = {
  id: string;
  verificationCode: string;
  issuedAt: string;
  formationTitle: string;
  learnerName: string;
  physicallyDelivered?: boolean;
  deliveredAt?: string | null;
};

export type AdminStats = {
  activeLearners: number;
  averageSuccessRate: number;
  certificatesIssued: number;
  modulesCount: number;
  publishedLessons: number;
  quizAttemptsTotal: number;
};

export type ProgressResponse = {
  formationId: string;
  formationTitle: string;
  completionPercent: number;
  currentModuleId: string | null;
  resumeLessonId: string | null;
  resumeModuleTitle: string | null;
  modules: Module[];
};

export type ModuleQuizItem = {
  id: string;
  title: string;
  quizType: QuizType;
  lessonId: string | null;
  moduleId: string | null;
  published: boolean;
};

export type ModuleDetail = Module & {
  lessons: Lesson[];
  quizzes: ModuleQuizItem[];
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  status?: number;
  fields?: Record<string, string>;
};
