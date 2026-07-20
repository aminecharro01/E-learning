import apiClient from "@/lib/api-client";
import type {
  AdminStats,
  Certificate,
  Lesson,
  LessonBlock,
  Module,
  ModuleDetail,
  ProgressResponse,
  Question,
  Quiz,
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

export async function register(email: string, password: string, fullName: string) {
  const { data } = await apiClient.post<User>("/api/auth/register", {
    email,
    password,
    fullName,
  });
  return data;
}

export async function logout() {
  await apiClient.post("/api/auth/logout");
}

export async function getMe() {
  const { data } = await apiClient.get<User>("/api/auth/me");
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

export async function createLesson(
  moduleId: string,
  payload: { title: string; orderIndex: number; published?: boolean }
) {
  const { data } = await apiClient.post<Lesson>(`/api/modules/${moduleId}/lessons`, payload);
  return data;
}

export async function updateModule(
  moduleId: string,
  payload: { title: string; description?: string; orderIndex: number; published?: boolean }
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

export async function unlockModuleForUser(userId: string, moduleId: string) {
  const { data } = await apiClient.post(`/api/admin/users/${userId}/unlock-module/${moduleId}`);
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

export type { LessonBlock, ModuleDetail };
