import type { Metadata } from "next";
import CompleteProfileCard from "@/components/auth/CompleteProfileCard";

export const metadata: Metadata = {
  title: "Finaliser mon compte | IAT Academy",
  description: "Première connexion — renseignez votre e-mail et votre mot de passe personnel",
};

export default function CompleteProfilePage() {
  return <CompleteProfileCard />;
}
