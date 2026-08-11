"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { btn } from "@/lib/ui";

type Props = {
  className?: string;
};

export function ThemeToggleButton({ className = "" }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      title={theme === "dark" ? "Mode clair" : "Mode sombre"}
      className={`${btn.icon} ${className}`}
    >
      {/* Sun — visible in dark mode (click to go light) */}
      <Sun className="hidden dark:block" size={18} aria-hidden />
      {/* Moon — visible in light mode */}
      <Moon className="block dark:hidden" size={18} aria-hidden />
    </button>
  );
}
