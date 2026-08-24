"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { PageLoader } from "@/components/ui/Loader";

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, hasRole } = useAuth();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!hasRole("SUPER_ADMIN", "ADMIN", "FORMATEUR")) {
      router.replace("/app");
    }
  }, [loading, user, hasRole, router, pathname]);

  if (loading || !user || !hasRole("SUPER_ADMIN", "ADMIN", "FORMATEUR")) {
    return <PageLoader label="Vérification de session…" />;
  }

  const offset = isExpanded || isHovered || isMobileOpen ? "lg:ml-[290px]" : "lg:ml-[90px]";

  return (
    <div className="app-horizon min-h-screen">
      <CommandPalette />
      <AdminSidebar />
      {isMobileOpen && (
        <div className="app-overlay fixed inset-0 z-40 lg:hidden" aria-hidden />
      )}
      <div className={`transition-all duration-300 ${offset}`}>
        <AdminHeader />
        <main
          className={`mx-auto px-4 py-6 lg:px-6 ${
            (pathname.includes("/admin/modules/") && pathname !== "/admin/modules") ||
            pathname.startsWith("/admin/quiz-bank")
              ? "max-w-[1600px]"
              : "max-w-7xl"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <AdminShell>{children}</AdminShell>
      </SidebarProvider>
    </AuthProvider>
  );
}
