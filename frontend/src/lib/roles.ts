import type { Role } from "@/types/domain";

/** Canonical French label per role — keep in sync with the role picker in admin/users/page.tsx. */
export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Directeur",
  FORMATEUR: "Formateur",
  ETUDIANT: "Apprenant",
  SUPPORT: "Support",
};
