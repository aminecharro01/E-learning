import apiClient from "@/lib/api-client";
import type {
  AdminStats,
  AgendaItem,
  AuditLogEntryItem,
  Badge,
  Certificate,
  EnrollmentMode,
  Lesson,
  LessonBlock,
  LessonComment,
  GroupAssignment,
  GroupImportResult,
  GroupMember,
  LearnerGroup,
  Module,
  ModuleDetail,
  NotificationListResponse,
  ProctoringEvent,
  ProgressResponse,
  Question,
  Quiz,
  SearchResultItem,
  SignoffInviteView,
  User,
} from "@/types/domain";

export { apiClient as api };
export type { ProgressResponse, Module, Lesson, User, Quiz };

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type LearnerSummary = {
  id: string;
  email: string;
  fullName: string | null;
  enabled: boolean;
  completionPercent: number;
  completedModules: number;
  totalModules: number;
};

export type LearnerProgressDetail = {
  userId: string;
  email: string;
  fullName: string | null;
  formationTitle: string;
  completionPercent: number;
  modules: Array<{
    moduleId: string;
    title: string;
    orderIndex: number;
    status: string;
    lessons: Array<{
      lessonId: string;
      title: string;
      orderIndex: number;
      published: boolean;
      completed: boolean;
    }>;
  }>;
};

export type QuizSettings = {
  defaultSectionPassingScore: number;
  defaultModulePassingScore: number;
  defaultModuleMaxAttempts: number;
  defaultModuleTimeLimitSeconds: number;
  defaultRetryDelayHours: number;
  sectionCompletionVideoPercent: number;
};

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<User>("/api/auth/login", { email, password });
  return data;
}

export async function verifyTotpLogin(pendingToken: string, code: string) {
  const { data } = await apiClient.post<User>("/api/auth/verify-2fa", { pendingToken, code });
  return data;
}

export async function enableTotp() {
  const { data } = await apiClient.post<{ secret: string; otpauthUri: string }>("/api/auth/2fa/enable");
  return data;
}

export async function confirmTotp(code: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/auth/2fa/confirm", { code });
  return data;
}

export async function disableTotp(code: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/auth/2fa/disable", { code });
  return data;
}

export async function register(payload: {
  civility: "MR" | "MME";
  fullName: string;
  city: string;
  phone: string;
  email: string;
  educationLevel: string;
  lastSchoolType: string;
  password: string;
  termsAccepted: boolean;
}) {
  const { data } = await apiClient.post<User>("/api/auth/register", payload);
  return data;
}

export async function logout() {
  await apiClient.post("/api/auth/logout");
}

export async function getMe() {
  const { data } = await apiClient.get<User>("/api/auth/me");
  return data;
}

export type AssetSummary = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  assetKind: string;
  durationSec: number | null;
  streamUrl: string;
  folderId?: string | null;
};

export async function listAssets(kind: "IMAGE" | "VIDEO" | "PDF" | "SLIDE" = "IMAGE", page = 0, size = 24) {
  const { data } = await apiClient.get<PageResponse<AssetSummary>>("/api/assets", { params: { kind, page, size } });
  return data;
}

/** Admin media file manager — folders + Bunny/local-disk assets in one browsable tree. */
export type FolderSummary = { id: string; name: string; parentId: string | null };
export type BreadcrumbEntry = { id: string; name: string };
export type MediaBrowseResponse = {
  currentFolder: FolderSummary | null;
  breadcrumbs: BreadcrumbEntry[];
  childFolders: FolderSummary[];
  assets: PageResponse<AssetSummary>;
};

export async function browseMedia(folderId?: string, kind?: string, page = 0, size = 24) {
  const { data } = await apiClient.get<MediaBrowseResponse>("/api/media-folders/browse", {
    params: { folderId, kind, page, size },
  });
  return data;
}

export async function createMediaFolder(name: string, parentId?: string) {
  const { data } = await apiClient.post<FolderSummary>("/api/media-folders", { name, parentId });
  return data;
}

export async function renameMediaFolder(id: string, name: string) {
  const { data } = await apiClient.patch<FolderSummary>(`/api/media-folders/${id}`, { name });
  return data;
}

export async function previewDeleteMediaFolder(id: string) {
  const { data } = await apiClient.get<{ folderCount: number; assetCount: number }>(
    `/api/media-folders/${id}/delete-preview`
  );
  return data;
}

export async function deleteMediaFolder(id: string) {
  await apiClient.delete(`/api/media-folders/${id}`);
}

export async function deleteAsset(id: string) {
  await apiClient.delete(`/api/assets/${id}`);
}

export async function moveAsset(id: string, folderId: string | null) {
  const { data } = await apiClient.patch<AssetSummary>(`/api/assets/${id}/move`, { folderId });
  return data;
}

export async function uploadAssetToFolder(
  file: File,
  kind: string,
  folderId: string | null,
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  if (folderId) form.append("folderId", folderId);
  const { data } = await apiClient.post<AssetSummary>("/api/assets/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (evt) => {
          if (!evt.total) return;
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      : undefined,
  });
  return data;
}

export async function updateMyProfile(payload: {
  fullName?: string;
  phone?: string;
  cin?: string;
  birthDate?: string | null;
  address?: string;
}) {
  const { data } = await apiClient.patch<User>("/api/auth/profile", payload);
  return data;
}

export async function uploadMyAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<User>("/api/auth/profile/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function adminUpdateUserProfile(
  userId: string,
  payload: {
    fullName?: string;
    phone?: string;
    cin?: string;
    birthDate?: string | null;
    address?: string;
  }
) {
  const { data } = await apiClient.patch<User>(`/api/admin/users/${userId}/profile`, payload);
  return data;
}

export async function getMyProgress() {
  const { data } = await apiClient.get<ProgressResponse>("/api/progress/me");
  return data;
}

export async function getModule(moduleId: string) {
  const { data } = await apiClient.get<ModuleDetail>(`/api/modules/${moduleId}`);
  return data;
}

export async function markLessonComplete(lessonId: string) {
  const { data } = await apiClient.post<{
    lessonId: string;
    videoWatchedPercent: number;
    completed: boolean;
    completedAt: string | null;
  }>(`/api/progress/lessons/${lessonId}/complete`);
  return data;
}

export async function getLesson(lessonId: string) {
  const { data } = await apiClient.get<Lesson>(`/api/lessons/${lessonId}`);
  return data;
}

export async function getLessonComments(lessonId: string) {
  const { data } = await apiClient.get<LessonComment[]>(`/api/lessons/${lessonId}/comments`);
  return data;
}

export async function createLessonComment(lessonId: string, body: string, parentId?: string) {
  const { data } = await apiClient.post<LessonComment>(`/api/lessons/${lessonId}/comments`, { body, parentId });
  return data;
}

export async function getModuleComments(moduleId: string) {
  const { data } = await apiClient.get<LessonComment[]>(`/api/modules/${moduleId}/comments`);
  return data;
}

export async function createModuleComment(moduleId: string, body: string, parentId?: string) {
  const { data } = await apiClient.post<LessonComment>(`/api/modules/${moduleId}/comments`, { body, parentId });
  return data;
}

export async function hideLessonComment(commentId: string) {
  const { data } = await apiClient.post<{ message: string }>(`/api/lessons/comments/${commentId}/hide`);
  return data;
}

export async function unhideLessonComment(commentId: string) {
  const { data } = await apiClient.post<{ message: string }>(`/api/lessons/comments/${commentId}/unhide`);
  return data;
}

export async function pinLessonComment(commentId: string) {
  const { data } = await apiClient.post<{ message: string }>(`/api/lessons/comments/${commentId}/pin`);
  return data;
}

export async function unpinLessonComment(commentId: string) {
  const { data } = await apiClient.post<{ message: string }>(`/api/lessons/comments/${commentId}/unpin`);
  return data;
}

export async function getCommentModerationQueue(page = 0, size = 20) {
  const { data } = await apiClient.get<PageResponse<LessonComment>>("/api/admin/comments/moderation", {
    params: { page, size },
  });
  return data;
}

export async function createLesson(
  moduleId: string,
  payload: { title: string; orderIndex: number; published?: boolean }
) {
  const { data } = await apiClient.post<Lesson>(`/api/modules/${moduleId}/lessons`, payload);
  return data;
}

export async function updateModule(
  moduleId: string,
  payload: {
    title: string;
    description?: string;
    orderIndex: number;
    published?: boolean;
    yearNumber?: number;
    ufCode?: string;
    ufTitle?: string;
  }
) {
  const { data } = await apiClient.put<Module>(`/api/modules/${moduleId}`, payload);
  return data;
}

export async function updateLesson(
  lessonId: string,
  payload: { title?: string; orderIndex?: number; published?: boolean }
) {
  const { data } = await apiClient.put<Lesson>(`/api/lessons/${lessonId}`, payload);
  return data;
}

export async function deleteLesson(lessonId: string) {
  await apiClient.delete(`/api/lessons/${lessonId}`);
}

export async function createQuiz(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<Quiz>("/api/quiz", payload);
  return data;
}

export type UfQuizItem = { id: string; title: string; quizType: string; published: boolean };

export async function getUfQuiz(ufCode: string) {
  const { data } = await apiClient.get<UfQuizItem | "">("/api/quiz/uf-quiz", { params: { ufCode } });
  return data || null;
}

export type YearExam = { quizId: string; title: string; unlocked: boolean };

export async function getYearExam(year: number) {
  const { data } = await apiClient.get<YearExam | "">("/api/quiz/year-exam", { params: { year } });
  return data || null;
}

export type QuizAttemptAdmin = {
  id: string;
  userId: string;
  userFullName: string;
  status: string;
  score: number | null;
  startedAt: string;
  submittedAt: string | null;
  proctoringEventCount: number;
};

export async function listQuizAttemptsForStaff(quizId: string) {
  const { data } = await apiClient.get<QuizAttemptAdmin[]>(`/api/quiz/${quizId}/attempts/all`);
  return data;
}

export async function getProctoringEvents(attemptId: string) {
  const { data } = await apiClient.get<ProctoringEvent[]>(`/api/quiz/attempts/${attemptId}/proctoring-events`);
  return data;
}

export async function listQuizzes(moduleId?: string) {
  const { data } = await apiClient.get<Quiz[]>("/api/quiz", {
    params: moduleId ? { moduleId } : undefined,
  });
  return data;
}

export async function listQuizzesPaged(page: number, size = 10, moduleId?: string) {
  const { data } = await apiClient.get<PageResponse<Quiz>>("/api/quiz", {
    params: { page, size, ...(moduleId ? { moduleId } : {}) },
  });
  return data;
}

export async function listQuizQuestions(quizId: string) {
  const { data } = await apiClient.get<Question[]>(`/api/quiz/${quizId}/questions`);
  return data;
}

export async function addQuizQuestion(quizId: string, payload: Record<string, unknown>) {
  const { data } = await apiClient.post<Quiz>(`/api/quiz/${quizId}/questions`, payload);
  return data;
}

export type AiGenerationPayload = {
  lessonId?: string;
  rawText?: string;
  questionType: "SINGLE_CHOICE" | "MULTI_CHOICE" | "TRUE_FALSE" | "ESSAY";
  count: number;
};

export type AiGenerationResult = { generatedCount: number; errors: { rowNumber: number; reason: string }[] };

export async function generateQuizQuestionsAi(quizId: string, payload: AiGenerationPayload) {
  const { data } = await apiClient.post<AiGenerationResult>(
    `/api/quiz/${quizId}/questions/generate-ai`,
    payload
  );
  return data;
}

export async function updateQuizQuestion(
  quizId: string,
  questionId: string,
  payload: Record<string, unknown>
) {
  const { data } = await apiClient.put<Question>(
    `/api/quiz/${quizId}/questions/${questionId}`,
    payload
  );
  return data;
}

export async function deleteQuizQuestion(quizId: string, questionId: string) {
  await apiClient.delete(`/api/quiz/${quizId}/questions/${questionId}`);
}

export async function duplicateQuizQuestion(quizId: string, questionId: string) {
  const { data } = await apiClient.post<Question>(`/api/quiz/${quizId}/questions/${questionId}/duplicate`);
  return data;
}

export async function reorderQuizQuestions(quizId: string, questionIds: string[]) {
  await apiClient.put(`/api/quiz/${quizId}/questions/reorder`, { questionIds });
}

export async function duplicateQuiz(quizId: string) {
  const { data } = await apiClient.post<Quiz>(`/api/quiz/${quizId}/duplicate`);
  return data;
}

export async function deleteQuiz(quizId: string) {
  await apiClient.delete(`/api/quiz/${quizId}`);
}

export async function getPendingReviewAttempts(quizId?: string) {
  const { data } = await apiClient.get<
    {
      attemptId: string;
      quizId: string;
      quizTitle: string;
      userId: string;
      userFullName: string;
      submittedAt: string;
      essayAnswers: {
        questionId: string;
        prompt: string;
        submittedText: string | null;
        graded: boolean;
        score: number | null;
        feedback: string | null;
      }[];
    }[]
  >("/api/quiz/attempts/pending-review", { params: quizId ? { quizId } : undefined });
  return data;
}

export type Assignment = {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  maxScore: number;
  submissionCount: number;
};

export type Submission = {
  id: string;
  assignmentId: string;
  userId: string;
  userFullName: string;
  assetId: string | null;
  submittedAt: string;
  status: "SUBMITTED" | "LATE" | "GRADED";
  grade: number | null;
  feedback: string | null;
};

export async function sendLessonHeartbeat(lessonId: string, deltaSeconds: number) {
  await apiClient.post(`/api/lessons/${lessonId}/heartbeat`, { deltaSeconds }).catch(() => undefined);
}

export type Conversation = {
  id: string;
  type: "DIRECT" | "COHORT_ROOM";
  title: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
};

export type ChatMessage = { id: string; senderId: string; senderName: string; body: string; createdAt: string };

export async function listConversations() {
  const { data } = await apiClient.get<Conversation[]>("/api/conversations");
  return data;
}

export type StaffContact = { id: string; fullName: string; role: "FORMATEUR" | "ADMIN" };

export async function listMessagingStaffContacts() {
  const { data } = await apiClient.get<StaffContact[]>("/api/conversations/staff");
  return data;
}

export async function getOrCreateDirectConversation(otherUserId: string) {
  const { data } = await apiClient.post<{ conversationId: string }>(`/api/conversations/direct/${otherUserId}`);
  return data.conversationId;
}

export async function listConversationMessages(conversationId: string, since?: string) {
  const { data } = await apiClient.get<ChatMessage[]>(`/api/conversations/${conversationId}/messages`, {
    params: since ? { since } : undefined,
  });
  return data;
}

export async function sendConversationMessage(conversationId: string, body: string) {
  const { data } = await apiClient.post<ChatMessage>(`/api/conversations/${conversationId}/messages`, { body });
  return data;
}

export type Campaign = {
  id: string;
  subject: string;
  status: "DRAFT" | "SENDING" | "SENT" | "FAILED";
  targetAudience: "NEWSLETTER_SUBSCRIBERS" | "ALL_STUDENTS" | "SPECIFIC_GROUP";
  sentAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
};

export async function listCampaigns() {
  const { data } = await apiClient.get<Campaign[]>("/api/admin/campaigns");
  return data;
}

export async function createCampaign(payload: {
  subject: string;
  htmlBody: string;
  targetAudience: Campaign["targetAudience"];
  targetGroupId?: string;
}) {
  const { data } = await apiClient.post<Campaign>("/api/admin/campaigns", payload);
  return data;
}

export async function sendCampaign(campaignId: string) {
  const { data } = await apiClient.post<{ message: string }>(`/api/admin/campaigns/${campaignId}/send`);
  return data;
}

export type VirtualSession = {
  id: string;
  moduleId: string | null;
  groupId: string;
  groupName: string;
  title: string;
  provider: "ZOOM" | "GOOGLE_MEET" | "TEAMS" | "JITSI" | "OTHER";
  joinUrl: string;
  scheduledAt: string;
  durationMinutes: number;
};

export async function listGroupSessions(groupId: string) {
  const { data } = await apiClient.get<VirtualSession[]>(`/api/groups/${groupId}/sessions`);
  return data;
}

export async function createVirtualSession(payload: {
  moduleId?: string;
  groupId: string;
  title: string;
  provider: VirtualSession["provider"];
  joinUrl: string;
  scheduledAt: string;
  durationMinutes?: number;
}) {
  const { data } = await apiClient.post<VirtualSession>("/api/admin/sessions", payload);
  return data;
}

export async function deleteVirtualSession(sessionId: string) {
  await apiClient.delete(`/api/admin/sessions/${sessionId}`);
}

export async function getInactiveStudents(days = 7) {
  const { data } = await apiClient.get<
    { userId: string; fullName: string; lastActivity: string | null; daysInactive: number }[]
  >("/api/admin/analytics/inactive-students", { params: { days } });
  return data;
}

export async function getModuleTimeBreakdown(moduleId: string) {
  const { data } = await apiClient.get<{ lessonId: string; lessonTitle: string; totalSeconds: number }[]>(
    `/api/admin/analytics/modules/${moduleId}/time`
  );
  return data;
}

export async function listModuleAssignments(moduleId: string) {
  const { data } = await apiClient.get<Assignment[]>(`/api/modules/${moduleId}/assignments`);
  return data;
}

export type LearnerAssignment = {
  id: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  maxScore: number;
  mySubmission: Submission | null;
};

export async function listMyAssignments(moduleId: string) {
  const { data } = await apiClient.get<LearnerAssignment[]>(`/api/modules/${moduleId}/assignments/mine`);
  return data;
}

export async function createAssignment(payload: {
  moduleId: string;
  title: string;
  description?: string;
  dueAt?: string;
  maxScore?: number;
}) {
  const { data } = await apiClient.post<Assignment>("/api/admin/assignments", payload);
  return data;
}

export async function deleteAssignment(assignmentId: string) {
  await apiClient.delete(`/api/admin/assignments/${assignmentId}`);
}

export async function submitAssignment(assignmentId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<Submission>(`/api/assignments/${assignmentId}/submit`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listSubmissions(assignmentId: string) {
  const { data } = await apiClient.get<Submission[]>(`/api/admin/assignments/${assignmentId}/submissions`);
  return data;
}

export async function gradeSubmission(submissionId: string, grade: number, feedback?: string) {
  const { data } = await apiClient.patch<{ message: string }>(`/api/admin/submissions/${submissionId}/grade`, {
    grade,
    feedback,
  });
  return data;
}

export type GradebookResponse = {
  evaluations: { id: string; label: string; type: "QUIZ" | "ASSIGNMENT" }[];
  rows: {
    userId: string;
    fullName: string;
    scores: Record<string, number>;
    bonus: number;
    average: number | null;
  }[];
};

export async function getGradebook(moduleId: string) {
  const { data } = await apiClient.get<GradebookResponse>(`/api/admin/gradebook/modules/${moduleId}`);
  return data;
}

export async function addGradeAdjustment(userId: string, moduleId: string, points: number, reason?: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/admin/gradebook/adjustments", {
    userId,
    moduleId,
    points,
    reason,
  });
  return data;
}

export async function gradeEssay(attemptId: string, questionId: string, score: number, feedback?: string) {
  const { data } = await apiClient.patch<{ message: string }>(
    `/api/quiz/attempts/${attemptId}/questions/${questionId}/grade`,
    { score, feedback }
  );
  return data;
}

export async function getMyCertificate() {
  const { data } = await apiClient.get<Certificate>("/api/certificates/me");
  return data;
}

export async function downloadMyCertificate() {
  const { data } = await apiClient.get<Blob>("/api/certificates/me/download", {
    responseType: "blob",
  });
  return data;
}

export async function getAdminStats() {
  const { data } = await apiClient.get<AdminStats>("/api/admin/stats");
  return data;
}

export async function listUsers() {
  const { data } = await apiClient.get<User[]>("/api/admin/users");
  return data;
}

export async function listUsersPaged(page: number, size = 10, q?: string) {
  const { data } = await apiClient.get<PageResponse<User>>("/api/admin/users/paged", {
    params: { page, size, ...(q ? { q } : {}) },
  });
  return data;
}

export async function listLearners(page: number, size = 10, q?: string) {
  const { data } = await apiClient.get<PageResponse<LearnerSummary>>("/api/admin/learners", {
    params: { page, size, ...(q ? { q } : {}) },
  });
  return data;
}

export async function getLearnerProgress(userId: string) {
  const { data } = await apiClient.get<LearnerProgressDetail>(
    `/api/admin/learners/${userId}/progress`
  );
  return data;
}

export async function getQuizSettings() {
  const { data } = await apiClient.get<QuizSettings>("/api/admin/settings/quiz");
  return data;
}

export async function updateQuizSettings(payload: QuizSettings) {
  const { data } = await apiClient.put<QuizSettings>("/api/admin/settings/quiz", payload);
  return data;
}

export type AppSettings = {
  platformName: string;
  supportEmail: string;
  registrationEnabled: boolean;
  defaultResetPassword: string;
  year2OpeningDate?: string | null;
  themeVariant: string;
};

export async function getAppSettings() {
  const { data } = await apiClient.get<AppSettings>("/api/admin/settings/app");
  return data;
}

export async function updateAppSettings(payload: AppSettings) {
  const { data } = await apiClient.put<AppSettings>("/api/admin/settings/app", payload);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/auth/reset-password", {
    token,
    newPassword,
  });
  return data;
}

export async function verifyEmail(token: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/auth/verify-email", { token });
  return data;
}

export async function resendVerification(email: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/auth/resend-verification", { email });
  return data;
}

export async function getMyNotifications(page = 0, size = 20) {
  const { data } = await apiClient.get<NotificationListResponse>("/api/me/notifications", {
    params: { page, size },
  });
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.post<{ message: string }>(`/api/me/notifications/${id}/read`);
  return data;
}

export async function searchCatalog(q: string, limit = 8) {
  const { data } = await apiClient.get<{ items: SearchResultItem[] }>("/api/search", {
    params: { q, limit },
  });
  return data.items;
}

export async function getMyLevel() {
  const { data } = await apiClient.get<{ level: number; badgeCount: number; totalBadges: number }>(
    "/api/me/badges/level"
  );
  return data;
}

export async function getGroupLeaderboard(groupId: string) {
  const { data } = await apiClient.get<
    { rank: number; userId: string; fullName: string; averageScore: number }[]
  >(`/api/admin/groups/${groupId}/leaderboard`);
  return data;
}

export async function getMyBadges() {
  const { data } = await apiClient.get<Badge[]>("/api/me/badges");
  return data;
}

export async function getMyAgenda() {
  const { data } = await apiClient.get<AgendaItem[]>("/api/me/agenda");
  return data;
}

export async function getMyTheme() {
  const { data } = await apiClient.get<{ themeVariant: string }>("/api/me/theme");
  return data;
}

/* ---------------------------------------------------------------- Groupes */

export async function listGroups() {
  const { data } = await apiClient.get<LearnerGroup[]>("/api/admin/groups");
  return data;
}

export async function createGroup(
  name: string,
  options?: { code?: string; startDate?: string; endDate?: string; enrollmentMode?: EnrollmentMode }
) {
  const { data } = await apiClient.post<LearnerGroup>("/api/admin/groups", { name, ...options });
  return data;
}

export async function deleteGroup(groupId: string) {
  const { data } = await apiClient.delete<{ message: string }>(`/api/admin/groups/${groupId}`);
  return data;
}

export async function listGroupMembers(groupId: string) {
  const { data } = await apiClient.get<GroupMember[]>(`/api/admin/groups/${groupId}/members`);
  return data;
}

export async function addGroupMember(groupId: string, userId: string) {
  const { data } = await apiClient.post<{ message: string }>(
    `/api/admin/groups/${groupId}/members/${userId}`
  );
  return data;
}

export async function removeGroupMember(groupId: string, userId: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/admin/groups/${groupId}/members/${userId}`
  );
  return data;
}

export async function importGroup(name: string, file: File) {
  const form = new FormData();
  form.append("name", name);
  form.append("file", file);
  const { data } = await apiClient.post<GroupImportResult>("/api/admin/groups/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listGroupAssignments(groupId: string) {
  const { data } = await apiClient.get<GroupAssignment[]>(
    `/api/admin/groups/${groupId}/assignments`
  );
  return data;
}

export async function assignGroupContent(
  groupId: string,
  payload: {
    targetType: "MODULE" | "UF";
    moduleId?: string;
    ufCode?: string;
    unlockAt?: string | null;
  }
) {
  const { data } = await apiClient.post<GroupAssignment[]>(
    `/api/admin/groups/${groupId}/assignments`,
    payload
  );
  return data;
}

export async function revokeGroupAssignment(groupId: string, assignmentId: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/admin/groups/${groupId}/assignments/${assignmentId}`
  );
  return data;
}

export async function completeProfile(payload: {
  email: string;
  phone: string;
  newPassword: string;
}) {
  const { data } = await apiClient.patch<User>("/api/auth/complete-profile", payload);
  return data;
}

export async function resetUserPassword(userId: string) {
  const { data } = await apiClient.post<{ message: string; temporaryPassword: string }>(
    `/api/admin/users/${userId}/reset-password`
  );
  return data;
}

export async function updateUserRole(userId: string, role: string) {
  const { data } = await apiClient.patch<User>(`/api/admin/users/${userId}/role`, { role });
  return data;
}

export async function setUserEnabled(userId: string, enabled: boolean) {
  const { data } = await apiClient.patch<User>(`/api/admin/users/${userId}/enabled`, {
    enabled,
  });
  return data;
}

export async function bulkSetUsersEnabled(userIds: string[], enabled: boolean) {
  const { data } = await apiClient.patch<{ message: string }>("/api/admin/users/bulk", {
    userIds,
    enabled,
  });
  return data;
}

export async function getAuditLog(page = 0, size = 20) {
  const { data } = await apiClient.get<PageResponse<AuditLogEntryItem>>("/api/admin/audit-log", {
    params: { page, size },
  });
  return data;
}

export async function setUserYear2Access(userId: string, year2AccessEnabled: boolean) {
  const { data } = await apiClient.patch<User>(`/api/admin/users/${userId}/year2-access`, {
    year2AccessEnabled,
  });
  return data;
}

export async function unlockModuleForUser(userId: string, moduleId: string) {
  const { data } = await apiClient.post(`/api/admin/users/${userId}/unlock-module/${moduleId}`);
  return data;
}

export async function openYear2ForAll() {
  const { data } = await apiClient.post<{ message: string }>("/api/admin/year2/open-all");
  return data;
}

export type LearnerDocType =
  | "CONVENTION_ECOLE"
  | "ASSURANCE"
  | "CONVENTION_ENTREPRISE"
  | "RAPPORT_STAGE"
  | "PRESENTATION_SOUTENANCE";

export type LearnerDossier = {
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  stageComplete: boolean;
  soutenanceComplete: boolean;
  slots: Array<{
    docType: LearnerDocType;
    label: string;
    owner: "DIRECTOR" | "LEARNER";
    section: "STAGE" | "SOUTENANCE";
    required: boolean;
    filled: boolean;
    latestDocumentId: string | null;
  }>;
  documents: Array<{
    id: string;
    learnerId: string;
    docType: LearnerDocType;
    status: string;
    assetId: string;
    filename: string;
    mimeType: string;
    downloadUrl: string;
    notes: string | null;
    uploadedById: string;
    uploadedByName: string;
    createdAt: string;
  }>;
};

export type DiplomaReady = {
  certificateId: string;
  userId: string;
  learnerName: string;
  email: string;
  verificationCode: string;
  issuedAt: string;
  physicallyDelivered: boolean;
  deliveredAt: string | null;
  deliveredNote: string | null;
};

export async function getMyStageDossier() {
  const { data } = await apiClient.get<LearnerDossier>("/api/stage/me");
  return data;
}

export async function listStageDossiers() {
  const { data } = await apiClient.get<LearnerDossier[]>("/api/stage/learners");
  return data;
}

export async function getStageDossier(learnerId: string) {
  const { data } = await apiClient.get<LearnerDossier>(`/api/stage/learners/${learnerId}`);
  return data;
}

export async function uploadStageDocument(
  learnerId: string | "me",
  payload: { docType: LearnerDocType; assetId: string; notes?: string }
) {
  const path =
    learnerId === "me"
      ? "/api/stage/me/documents"
      : `/api/stage/learners/${learnerId}/documents`;
  const { data } = await apiClient.post(path, payload);
  return data;
}

export async function deleteStageDocument(documentId: string) {
  const { data } = await apiClient.delete<{ message: string }>(`/api/stage/documents/${documentId}`);
  return data;
}

export async function listDiplomas() {
  const { data } = await apiClient.get<DiplomaReady[]>("/api/admin/diplomas");
  return data;
}

export async function markDiplomaDelivered(
  certificateId: string,
  delivered: boolean,
  note?: string
) {
  const { data } = await apiClient.patch<DiplomaReady>(
    `/api/admin/diplomas/${certificateId}/delivered`,
    { delivered, note }
  );
  return data;
}

export async function downloadDiplomaPdf(certificateId: string) {
  const { data } = await apiClient.get<Blob>(`/api/certificates/${certificateId}/download`, {
    responseType: "blob",
  });
  return data;
}

export type UfValidation = {
  ufCode: string;
  validated: boolean;
  validatedAt: string | null;
  validatedByName: string | null;
  note: string | null;
};

export async function getUfValidations(learnerId: string | "me") {
  const path =
    learnerId === "me"
      ? "/api/stage/me/uf-validations"
      : `/api/stage/learners/${learnerId}/uf-validations`;
  const { data } = await apiClient.get<UfValidation[]>(path);
  return data;
}

export async function validateLearnerUf(
  learnerId: string,
  payload: { ufCode: string; validated: boolean; note?: string }
) {
  const { data } = await apiClient.post<UfValidation>(
    `/api/stage/learners/${learnerId}/uf-validations`,
    payload
  );
  return data;
}

export async function createStageSignoffInvite(payload: {
  learnerId: string;
  ufCode: string;
  tutorEmail: string;
  tutorName?: string;
}) {
  const { data } = await apiClient.post<{ message: string }>("/api/stage/signoff-invites", payload);
  return data;
}

export async function getSignoffInvite(token: string) {
  const { data } = await apiClient.get<SignoffInviteView>(`/api/public/stage-signoff/${token}`);
  return data;
}

export async function signOffStage(token: string, note?: string) {
  const { data } = await apiClient.post<{ message: string }>(`/api/public/stage-signoff/${token}/sign`, {
    note,
  });
  return data;
}

export async function uploadAsset(file: File, kind?: string) {
  const form = new FormData();
  form.append("file", file);
  if (kind) form.append("kind", kind);
  const { data } = await apiClient.post<{ id: string; filename: string; assetKind: string }>(
    "/api/assets/upload",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: undefined,
    }
  );
  return data;
}

/** Landing — contact form (public) */
export async function submitContactMessage(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}) {
  const { data } = await apiClient.post<{ message: string }>("/api/public/contact", payload);
  return data;
}

/** Landing — newsletter (public) */
export async function subscribeNewsletter(email: string) {
  const { data } = await apiClient.post<{ message: string }>("/api/public/newsletter", { email });
  return data;
}

export type ContactMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  status: "NEW" | "READ" | "ARCHIVED" | string;
  createdAt: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
};

export async function listContactMessages(
  page: number,
  size = 10,
  q?: string,
  status?: string
) {
  const { data } = await apiClient.get<PageResponse<ContactMessage>>(
    "/api/admin/contact-messages",
    { params: { page, size, ...(q ? { q } : {}), ...(status ? { status } : {}) } }
  );
  return data;
}

export async function updateContactMessageStatus(
  id: string,
  status: "NEW" | "READ" | "ARCHIVED"
) {
  const { data } = await apiClient.patch<ContactMessage>(
    `/api/admin/contact-messages/${id}/status`,
    { status }
  );
  return data;
}

export async function deleteContactMessage(id: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/admin/contact-messages/${id}`
  );
  return data;
}

export async function bulkUpdateContactMessageStatus(ids: string[], status: "NEW" | "READ" | "ARCHIVED") {
  const { data } = await apiClient.patch<{ message: string }>("/api/admin/contact-messages/bulk", {
    ids,
    status,
  });
  return data;
}

export async function listNewsletterSubscribers(
  page: number,
  size = 10,
  q?: string,
  active?: boolean
) {
  const { data } = await apiClient.get<PageResponse<NewsletterSubscriber>>(
    "/api/admin/newsletter-subscribers",
    {
      params: {
        page,
        size,
        ...(q ? { q } : {}),
        ...(active === undefined ? {} : { active }),
      },
    }
  );
  return data;
}

export async function setNewsletterSubscriberActive(id: string, active: boolean) {
  const { data } = await apiClient.patch<NewsletterSubscriber>(
    `/api/admin/newsletter-subscribers/${id}/active`,
    null,
    { params: { active } }
  );
  return data;
}

export async function deleteNewsletterSubscriber(id: string) {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/admin/newsletter-subscribers/${id}`
  );
  return data;
}

/* ------------------------------------------------------ Bourse à l'emploi (alumni) */

export type JobOffer = {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string | null;
  contractType: "CDI" | "CDD" | "STAGE" | "ALTERNANCE" | "FREELANCE";
  applyUrl: string | null;
  contactEmail: string | null;
  photoAssetId: string | null;
  published: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export type CreateJobOfferPayload = {
  title: string;
  company: string;
  description: string;
  location?: string;
  contractType: JobOffer["contractType"];
  applyUrl?: string;
  contactEmail?: string;
  photoAssetId?: string | null;
  expiresAt?: string | null;
};

export type UpdateJobOfferPayload = CreateJobOfferPayload & { published: boolean };

export async function listJobOffersAdmin() {
  const { data } = await apiClient.get<JobOffer[]>("/api/admin/job-offers");
  return data;
}

export async function createJobOffer(payload: CreateJobOfferPayload) {
  const { data } = await apiClient.post<JobOffer>("/api/admin/job-offers", payload);
  return data;
}

export async function updateJobOffer(id: string, payload: UpdateJobOfferPayload) {
  const { data } = await apiClient.put<JobOffer>(`/api/admin/job-offers/${id}`, payload);
  return data;
}

export async function deleteJobOffer(id: string) {
  const { data } = await apiClient.delete<{ message: string }>(`/api/admin/job-offers/${id}`);
  return data;
}

export async function listJobOffersForLearner() {
  const { data } = await apiClient.get<JobOffer[]>("/api/job-offers");
  return data;
}

export type { LessonBlock, ModuleDetail };
