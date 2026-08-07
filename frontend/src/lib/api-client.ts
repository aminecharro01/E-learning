import axios, { AxiosError, AxiosInstance } from "axios";
import type { ApiErrorBody } from "@/types/domain";
import { toast } from "@/lib/toast-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Central Axios client.
 * JWT is stored in an httpOnly cookie by the Spring Boot API — never in localStorage.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export class ApiClientError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data ?? null;
    const message =
      body?.message ||
      body?.error ||
      (status === 401
        ? "Identifiants invalides ou session expirée."
        : status === 403
          ? "Accès refusé."
          : status === 429
            ? "Trop de tentatives. Réessayez plus tard."
            : status === 404
              ? "Ressource introuvable."
              : "Une erreur est survenue.");

    if (typeof window !== "undefined" && status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/register")) {
        window.location.href = `/login?next=${encodeURIComponent(path)}`;
      }
    } else {
      // Global safety net so an error is never silent, even if the calling code
      // doesn't render its own inline alert. 401 is excluded: the redirect above
      // navigates away immediately, so the toast would never actually be seen.
      toast.error(message);
    }

    return Promise.reject(new ApiClientError(status, message, body));
  }
);

export default apiClient;
