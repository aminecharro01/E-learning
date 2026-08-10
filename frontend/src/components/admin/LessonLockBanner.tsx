"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import { useEffect, useState } from "react";
import apiClient, { ApiClientError } from "@/lib/api-client";

type LockInfo = {
  lessonId: string;
  lockedBy: string;
  lockedByName: string;
  expiresAt: string;
};

type Props = {
  lessonId: string;
};

export function LessonLockBanner({ lessonId }: Props) {
  const [lock, setLock] = useState<LockInfo | null>(null);
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function acquire() {
      try {
        const { data } = await apiClient.post<LockInfo>(`/api/lessons/${lessonId}/lock`);
        if (!cancelled) {
          setLock(data);
          setBlockedBy(null);
        }
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 409) {
          setBlockedBy(err.body?.message || "Section verrouillée par un autre formateur.");
        }
      }
    }

    void acquire();
    const intervalId = window.setInterval(() => {
      apiClient.patch(`/api/lessons/${lessonId}/lock`).catch(() => undefined);
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      apiClient.delete(`/api/lessons/${lessonId}/lock`).catch(() => undefined);
    };
  }, [lessonId]);

  if (blockedBy) {
    return <div className="alert alert-warning mb-4">{blockedBy}</div>;
  }

  if (!lock) return null;

  return (
    <div className="alert alert-info mb-4">
      Édition verrouillée pour vous ({lock.lockedByName}). Expire à{" "}
      {new Date(lock.expiresAt).toLocaleTimeString("fr-FR")}.
    </div>
  );
}
