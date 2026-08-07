"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCourse } from "@/components/learner/CourseProvider";
import { btn } from "@/lib/ui";

export default function LearnModuleIndexPage() {
  const params = useParams<{ moduleId: string }>();
  const router = useRouter();
  const { module } = useCourse();
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!params.moduleId || !module || module.id !== params.moduleId) return;
    const lessons = module.lessons || [];
    if (lessons.length === 0) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    const next = lessons.find((l) => !l.completed)?.id ?? lessons[0]?.id ?? null;
    if (next) {
      router.replace(`/app/learn/${params.moduleId}/s/${next}`);
    }
  }, [module, params.moduleId, router]);

  if (empty) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <p className="text-sm text-muted">
          Ce module n&apos;a pas encore de section publiée.
        </p>
        <Link href="/app" className={btn.primarySm}>
          Retour au parcours
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-8 text-sm text-muted">
      Ouverture de la section…
    </div>
  );
}
