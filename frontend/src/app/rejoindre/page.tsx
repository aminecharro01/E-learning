import type { Metadata } from "next";
import { RejoindrePage } from "@/components/rejoindre/RejoindrePage";

export const metadata: Metadata = {
  title: "Rejoindre IAT Academy — Candidature",
  description:
    "Devenez hôtesse de l'air, steward, agent d'escale ou accompagnateur touristique en 2 ans. Stage en milieu réel, diplôme reconnu, accompagnement personnalisé — candidatez dès maintenant.",
};

export default function Page() {
  return <RejoindrePage />;
}
