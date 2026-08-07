import type { Metadata } from "next";
import ForgotPasswordCard from "@/components/auth/ForgotPasswordCard";

export const metadata: Metadata = {
  title: "Mot de passe oublié | IAT Academy",
  description: "Réinitialisez votre mot de passe IAT Academy",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordCard />;
}
