"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getMyTheme } from "@/lib/api";

/**
 * Fetches the platform's chosen theme preset and applies it as a data attribute on
 * <html>, composing with the separate light/dark class from ThemeContext. Only runs
 * inside the authenticated shells (/admin, /app) — calling an authenticated endpoint
 * from the public site would trip the global 401 handler and bounce anonymous
 * visitors to /login just for loading the landing page.
 */
export function ThemeVariantSync() {
  const pathname = usePathname();

  useEffect(() => {
    const inAuthedShell = pathname.startsWith("/admin") || pathname.startsWith("/app");
    if (!inAuthedShell) return;
    let cancelled = false;
    getMyTheme()
      .then((res) => {
        if (!cancelled) {
          document.documentElement.dataset.themeVariant = res.themeVariant;
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
