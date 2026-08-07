"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

/**
 * Filet de sécurité pour les comptes importés : la redirection après login couvre
 * le cas normal, mais un accès direct à /app (favori, session déjà ouverte) doit
 * lui aussi ramener vers l'onboarding tant que le profil n'est pas finalisé.
 * Le JWT ne portant pas cet état, la vérification ne peut pas se faire en middleware.
 */
export function ProfileCompletionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((user) => {
        if (!cancelled && user.profileCompleted === false) {
          router.replace("/complete-profile");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return null;
}
