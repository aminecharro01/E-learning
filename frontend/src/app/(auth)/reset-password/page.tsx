import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordCard from "@/components/auth/ResetPasswordCard";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe | IAT Academy",
  description: "Choisissez un nouveau mot de passe pour votre compte IAT Academy",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="iat-board auth-board">
          <p className="bp-sub">Chargement…</p>
        </div>
      }
    >
      <ResetPasswordCard />
    </Suspense>
  );
}
