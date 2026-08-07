import { Suspense } from "react";
import type { Metadata } from "next";
import AuthBoardingPass from "@/components/auth/AuthBoardingPass";

export const metadata: Metadata = {
  title: "Connexion | IAT Academy",
  description: "Connectez-vous à la plateforme e-learning IAT Academy",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="iat-board auth-board">
          <p className="bp-sub">Chargement…</p>
        </div>
      }
    >
      <AuthBoardingPass initialMode="signin" />
    </Suspense>
  );
}
