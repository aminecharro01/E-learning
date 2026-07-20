"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLesson } from "@/lib/api";

/** Redirect legacy lesson URL → course shell */
export default function LegacyLessonRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params.id) return;
    getLesson(params.id)
      .then((lesson) => router.replace(`/app/learn/${lesson.moduleId}/s/${lesson.id}`))
      .catch(() => router.replace("/app"));
  }, [params.id, router]);

  return <p className="p-8 text-sm text-muted">Redirection…</p>;
}
