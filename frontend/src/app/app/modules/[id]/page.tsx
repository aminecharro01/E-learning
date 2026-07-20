"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Redirect legacy module URL → Coursera-style learn room */
export default function LegacyModuleRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.id) router.replace(`/app/learn/${params.id}`);
  }, [params.id, router]);

  return <p className="p-8 text-sm text-muted">Redirection…</p>;
}
