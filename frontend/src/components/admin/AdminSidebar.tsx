"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// AppSidebar-inspired navigation with icons + menu groups

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  ClipboardIcon,
  ClockIcon,
  GridIcon,
  JobsIcon,
  MailIcon,
  MediaIcon,
  MessagingIcon,
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
      { name: "Correction manuelle", path: "/admin/grading", icon: <ClipboardIcon /> },
      { name: "Médias", path: "/admin/media", icon: <MediaIcon /> },
      { name: "Stage & soutenance", path: "/admin/stage", icon: <BookIcon /> },
    ],
  },
  {
    label: "Suivi",
    items: [
      { name: "Apprenants", path: "/admin/learners", icon: <UsersIcon /> },
      { name: "Messagerie", path: "/admin/messages", icon: <MessagingIcon /> },
      { name: "Contact & infolettre", path: "/admin/leads", icon: <MailIcon /> },
      { name: "Devoirs & notes", path: "/admin/gradebook", icon: <ClipboardIcon /> },
      { name: "Forums", path: "/admin/forum", icon: <ChatIcon /> },
      { name: "Sessions live", path: "/admin/sessions", icon: <CalendarIcon /> },
      { name: "Bourse à l'emploi", path: "/admin/job-offers", icon: <JobsIcon /> },
      { name: "Groupes (présentiel)", path: "/admin/groups", icon: <UsersIcon />, adminOnly: true },
      { name: "Analytics", path: "/admin/analytics", icon: <ChartIcon /> },
      { name: "Campagnes email", path: "/admin/campaigns", icon: <MailIcon />, adminOnly: true },
      { name: "Diplômes", path: "/admin/diplomas", icon: <ChartIcon />, adminOnly: true },
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

/** Support n'a pas de rôle pédagogique : accès très restreint plutôt que la liste complète
 *  filtrée par adminOnly/superAdminOnly (qui, par défaut, montre tout au reste du staff). */
const SUPPORT_VISIBLE_PATHS = new Set(["/admin", "/admin/messages", "/admin/leads", "/admin/learners"]);

export function AdminSidebar() {
  const pathname = usePathname();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { isAdmin, isSuperAdmin, isSupport } = useAuth();
  const unreadMessages = useUnreadMessagesCount();

  const wide = isExpanded || isHovered || isMobileOpen;
  const spaceLabel = isSuperAdmin
    ? "Espace Super Admin"
    : isAdmin
      ? "Espace Directeur"
      : isSupport
        ? "Espace Support"
        : "Espace formateur";

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
            <span className="block text-sm font-semibold text-heading">{spaceLabel}</span>
            <span className="block text-xs text-muted">Administration</span>
          </span>
        )}
      </Link>

      <nav className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
        {GROUPS.map((group) => {
          const items = group.items.filter(
            (item) =>
              (!item.adminOnly || isAdmin) &&
              (!item.superAdminOnly || isSuperAdmin) &&
              (!isSupport || SUPPORT_VISIBLE_PATHS.has(item.path))
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
                          className={`relative flex size-6 shrink-0 items-center justify-center ${
                            active ? "text-primary" : "text-muted group-hover:text-heading"
                          }`}
                        >
                          {item.icon}
                          {item.path === "/admin/messages" && unreadMessages > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-[var(--danger-fg)]">
                              {unreadMessages > 9 ? "9+" : unreadMessages}
                            </span>
                          )}
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
    </aside>
  );
}
