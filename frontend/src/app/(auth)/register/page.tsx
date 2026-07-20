import type { Metadata } from "next";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Inscription | IAT Academy",
  description: "Créez votre compte apprenant IAT Academy",
};

export default function RegisterPage() {
  return <SignUpForm />;
}
