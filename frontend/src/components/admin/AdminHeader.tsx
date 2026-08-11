"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard

import { useRouter } from "next/navigation";
import { X, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/context/SidebarContext";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { btn } from "@/lib/ui";
import { ROLE_LABEL } from "@/lib/roles";

export function AdminHeader() {
  const { user, logout } = useAuth();
  const { toggleSidebar, toggleMobileSidebar, isMobileOpen } = useSidebar();
  const router = useRouter();

  return (
    <header className="app-header sticky top-0 z-40 flex w-full">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-theme px-3 py-3 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            type="button"
            aria-label="Afficher ou masquer le menu latéral"
            className={`${btn.icon} lg:h-11 lg:w-11`}
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 1024) {
                toggleMobileSidebar();
              } else {
                toggleSidebar();
              }
            }}
          >
            {isMobileOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>

          <div className="hidden lg:block">
            <p className="text-sm font-medium text-heading">Administration pédagogique</p>
            <p className="text-xs text-muted">IAT Academy</p>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <NotificationBell />
            <ThemeToggleButton className="h-10 w-10" />
          </div>
        </div>

        <div className="hidden w-full items-center justify-end gap-3 px-4 py-3 lg:flex lg:px-0">
          <NotificationBell />
          <ThemeToggleButton />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--neutral)] text-sm font-semibold text-[var(--neutral-fg)]">
              {(user?.fullName || user?.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-heading">
                {user?.fullName || user?.email || "…"}
              </p>
              <p className="text-xs uppercase tracking-wide text-muted">
                {user?.role ? ROLE_LABEL[user.role] : "…"}
              </p>
            </div>
            <button
              type="button"
              className={btn.secondarySm}
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
