"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// AppSidebar-inspired navigation with icons + menu groups

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { btn } from "@/lib/ui";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  ClipboardIcon,
  ClockIcon,
  GridIcon,
  MailIcon,
  MediaIcon,
  QuizIcon,
  SettingsIcon,
  UserCircleIcon,
  UsersIcon,
} from "@/components/admin/icons";

export type NavItem = {
  name: string;
  path: string;
  icon: ReactNode;
  adminOnly?: boolean;
  /** Réservé au Super Admin — réglages plateforme, pas de la compétence du Directeur. */
  superAdminOnly?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const GROUPS: NavGroup[] = [
  {
    label: "Menu",
    items: [
      { name: "Tableau de bord", path: "/admin", icon: <GridIcon /> },
      { name: "Cours & modules", path: "/admin/modules", icon: <BookIcon /> },
      { name: "Quiz", path: "/admin/quiz-bank", icon: <QuizIcon /> },
      { name: "Banques de questions", path: "/admin/question-banks", icon: <QuizIcon /> },
      { name: "Correction manuelle", path: "/admin/grading", icon: <ClipboardIcon /> },
      { name: "Médias", path: "/admin/media", icon: <MediaIcon /> },
      { name: "Stage & soutenance", path: "/admin/stage", icon: <BookIcon /> },
    ],
  },
  {
    label: "Suivi",
    items: [
      { name: "Apprenants", path: "/admin/learners", icon: <UsersIcon /> },
      { name: "Groupes (présentiel)", path: "/admin/groups", icon: <UsersIcon />, adminOnly: true },
      { name: "Forums", path: "/admin/forum", icon: <ChatIcon /> },
      { name: "Devoirs & notes", path: "/admin/gradebook", icon: <ClipboardIcon /> },
      { name: "Sessions live", path: "/admin/sessions", icon: <CalendarIcon /> },
      { name: "Analytics", path: "/admin/analytics", icon: <ChartIcon /> },
      { name: "Contact & infolettre", path: "/admin/leads", icon: <MailIcon /> },
      { name: "Campagnes email", path: "/admin/campaigns", icon: <MailIcon />, adminOnly: true },
      { name: "Diplômes", path: "/admin/diplomas", icon: <ChartIcon />, adminOnly: true },
      { name: "Statistiques", path: "/admin/stats", icon: <ChartIcon /> },
    ],
  },
  {
    label: "Système",
    items: [
      {
        name: "Utilisateurs",
        path: "/admin/users",
        icon: <UserCircleIcon />,
        adminOnly: true,
      },
      {
        name: "Paramètres",
        path: "/admin/settings",
        icon: <SettingsIcon />,
        superAdminOnly: true,
      },
      {
        name: "Journal d'audit",
        path: "/admin/audit-log",
        icon: <ClockIcon />,
        adminOnly: true,
      },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { isAdmin, isSuperAdmin } = useAuth();

  const wide = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`app-sidebar fixed left-0 top-0 z-50 flex h-screen flex-col px-3 py-6 transition-all duration-300
        ${wide ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href="/admin" className={`mb-8 flex items-center ${wide ? "gap-3 px-2" : "justify-center"}`}>
        <BrandLogo href={null} size={wide ? "md" : "sm"} />
        {wide && (
          <span>
            <span className="block text-sm font-semibold text-heading">Espace formateur</span>
            <span className="block text-xs text-muted">Administration</span>
          </span>
        )}
      </Link>

      <nav className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
        {GROUPS.map((group) => {
          const items = group.items.filter(
            (item) => (!item.adminOnly || isAdmin) && (!item.superAdminOnly || isSuperAdmin)
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <h2
                className={`nav-group-label mb-3 flex text-xs uppercase leading-[20px] ${
                  !wide ? "lg:justify-center" : "justify-start px-2"
                }`}
              >
                {wide ? group.label : "···"}
              </h2>
              <ul className="flex flex-col gap-1">
                {items.map((item) => {
                  const active =
                    item.path === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.path || pathname.startsWith(`${item.path}/`);
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        className={`nav-item group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                          ${active ? "nav-item-active" : ""}
                          ${!wide ? "lg:justify-center" : ""}
                        `}
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center ${
                            active ? "text-primary" : "text-muted group-hover:text-heading"
                          }`}
                        >
                          {item.icon}
                        </span>
                        {wide && <span>{item.name}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {wide && (
        <div className="app-sidebar-cta mt-auto rounded-2xl p-4">
          <p className="text-sm font-medium text-heading">Vue apprenant</p>
          <p className="mt-1 text-xs text-muted">Prévisualisez le parcours tel que vu par l&apos;étudiant.</p>
          <Link href="/app" className={`${btn.primarySm} mt-3 w-full`}>
            Ouvrir l&apos;espace apprenant
          </Link>
        </div>
      )}
    </aside>
  );
}
