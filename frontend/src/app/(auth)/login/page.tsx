import { Suspense } from "react";
import type { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Connexion | IAT Academy",
  description: "Connectez-vous à la plateforme e-learning IAT Academy",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-card">
          <p className="auth-subtitle">Chargement…</p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
