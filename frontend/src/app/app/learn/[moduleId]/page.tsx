"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getModule } from "@/lib/api";
import { CourseProvider } from "@/components/learner/CourseProvider";

export default function LearnModuleIndexPage() {
  const params = useParams<{ moduleId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params.moduleId) return;
    getModule(params.moduleId)
      .then((mod) => {
        const lessons = mod.lessons || [];
        const next =
          lessons.find((l) => !l.completed)?.id ?? lessons[0]?.id ?? null;
        if (next) {
          router.replace(`/app/learn/${params.moduleId}/s/${next}`);
        }
      })
      .catch(() => undefined);
  }, [params.moduleId, router]);

  return (
    <CourseProvider moduleId={params.moduleId}>
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted">
        Ouverture de la section…
      </div>
    </CourseProvider>
  );
}
