"use client";

import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ThemeVariantSync } from "@/components/ThemeVariantSync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeVariantSync />
      {children}
      <ToastProvider />
    </ThemeProvider>
  );
}
