"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLesson } from "@/lib/api";

/** Lesson editor is now the module studio (split outline + blocks). */
export default function AdminLessonRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params.id) return;
    getLesson(params.id)
      .then((lesson) =>
        router.replace(`/admin/modules/${lesson.moduleId}?section=${lesson.id}`)
      )
      .catch(() => router.replace("/admin/modules"));
  }, [params.id, router]);

  return <p className="text-sm text-muted">Ouverture du studio module…</p>;
}
