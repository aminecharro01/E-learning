import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyEmailCard from "@/components/auth/VerifyEmailCard";

export const metadata: Metadata = {
  title: "Vérification de l'e-mail | IAT Academy",
  description: "Confirmez votre adresse e-mail IAT Academy",
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="iat-board auth-board">
          <p className="bp-sub">Chargement…</p>
        </div>
      }
    >
      <VerifyEmailCard />
    </Suspense>
  );
}
