import { Suspense } from "react";
import type { Metadata } from "next";
import AuthBoardingPass from "@/components/auth/AuthBoardingPass";

export const metadata: Metadata = {
  title: "Inscription | IAT Academy",
  description: "Créez votre compte apprenant IAT Academy",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="iat-board auth-board">
          <p className="bp-sub">Chargement…</p>
        </div>
      }
    >
      <AuthBoardingPass initialMode="signup" />
    </Suspense>
  );
}
