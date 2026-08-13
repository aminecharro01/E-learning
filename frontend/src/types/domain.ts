/**
 * Domain types aligned with Spring Boot API entities.
 */

export type Role = "SUPER_ADMIN" | "ADMIN" | "FORMATEUR" | "ETUDIANT" | "SUPPORT";

export type BlockType = "VIDEO" | "TEXT" | "PDF" | "IMAGE";

export type QuizType = "APPLICATIF" | "FIN_MODULE";

export type QuestionType = "SINGLE_CHOICE" | "MULTI_CHOICE" | "TRUE_FALSE" | "ESSAY";

export type AttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "PASSED"
  | "FAILED"
  | "PENDING_REVIEW";

export type ModuleLearnerStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";

export type PaymentStatus = "PENDING" | "PAID" | "EXEMPTED";

export type Civility = "MR" | "MME" | "MLLE";

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  civility?: Civility | null;
  firstName?: string | null;
  lastName?: string | null;
  country?: string | null;
  city?: string | null;
  educationLevel?: string | null;
  lastSchoolType?: string | null;
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
  termsAcceptedAt?: string | null;
  marketingOptIn?: boolean;
  matricule?: string | null;
  /** False pour un compte importé qui n'a pas encore finalisé sa première connexion. */
  profileCompleted?: boolean;
  groupId?: string | null;
  groupName?: string | null;
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
  proctoringEnabled?: boolean;
  focusLossDetection?: boolean;
  copyProtection?: boolean;
  lockdownMode?: boolean;
  questionCount?: number;
};

export type ProctoringEventType =
  | "FOCUS_LOST"
  | "TAB_HIDDEN"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "FULLSCREEN_EXIT";

export type ProctoringEvent = {
  id: string;
  eventType: ProctoringEventType;
  occurredAt: string;
  meta: Record<string, unknown> | null;
};

export type ProctoringConfig = {
  enabled: boolean;
  focusLossDetection: boolean;
  copyProtection: boolean;
  lockdownMode: boolean;
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
  metadata?: Record<string, unknown> | null;
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
  newContactMessages: number;
  newsletterSubscribers: number;
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
  pendingToken?: string;
};

export type NotificationType =
  | "QUIZ_GRADED"
  | "MODULE_COMPLETED"
  | "UF_VALIDATED"
  | "BADGE_EARNED"
  | "MODULE_ASSIGNED";

export type EnrollmentMode = "EN_LIGNE" | "HYBRIDE";

export type LearnerGroup = {
  id: string;
  name: string;
  code: string | null;
  startDate: string | null;
  endDate: string | null;
  enrollmentMode: EnrollmentMode;
  memberCount: number;
  createdAt: string;
};

export type GroupMember = {
  id: string;
  fullName: string | null;
  email: string | null;
  matricule: string | null;
  enabled: boolean;
  profileCompleted: boolean;
};

export type GroupImportResult = {
  groupId: string;
  groupName: string;
  importedCount: number;
  defaultPassword: string;
  errors: { rowNumber: number; reason: string }[];
};

export type GroupAssignment = {
  id: string;
  moduleId: string;
  moduleTitle: string;
  ufCode: string | null;
  unlockAt: string | null;
  unlocked: boolean;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type SearchResultItem = {
  id: string;
  type: "MODULE" | "LESSON";
  title: string;
  link: string;
};

export type Badge = {
  code: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
  awardedAt: string | null;
};

export type LessonComment = {
  id: string;
  lessonId: string | null;
  moduleId: string | null;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorStaff: boolean;
  body: string;
  hidden: boolean;
  pinned: boolean;
  createdAt: string;
  replies: LessonComment[];
};

export type AuditLogEntryItem = {
  id: string;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  createdAt: string;
};

export type SignoffInviteView = {
  learnerName: string;
  ufCode: string;
  alreadyValidated: boolean;
  expiresAt: string;
};

export type AgendaItem = {
  type: "QUIZ_EXPIRING" | "QUIZ_RETRY" | "YEAR2_OPENING";
  label: string;
  at: string;
  link: string | null;
};

export type NotificationListResponse = {
  page: {
    content: AppNotification[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
  };
  unreadCount: number;
};
