"use client";

import { useEffect } from "react";

/**
 * Last-resort fallback — only fires if the root layout itself throws (error.tsx can't
 * catch that). Must render its own <html>/<body> since it replaces the whole document.
 * Deliberately plain/inline-styled: the app's own CSS/theme setup may be exactly what's
 * broken, so this can't depend on it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur critique (root layout) :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b1220",
          color: "#f1f5f9",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.05em", color: "#f59e0b" }}>
            IAT ACADEMY
          </p>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.5rem", fontWeight: 700 }}>Une erreur est survenue</h1>
          <p style={{ margin: "0.5rem auto 0", maxWidth: "28rem", fontSize: "0.875rem", color: "#94a3b8" }}>
            L&apos;application n&apos;a pas pu s&apos;afficher correctement. Réessayez, ou revenez plus tard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.625rem 1.5rem",
            borderRadius: "9999px",
            border: "none",
            background: "#f59e0b",
            color: "#0b1220",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
