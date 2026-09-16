/** Minimal auth-form icon set, backed by lucide-react */

"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";

export function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return <ChevronLeft size={20} className={className} aria-hidden />;
}

/**
 * Password-manager browser extensions (Bitwarden, 1Password, LastPass...)
 * inject their own show/hide icon into password fields before React
 * hydrates, causing a hydration mismatch on this exact node. Rendering a
 * static placeholder until after mount sidesteps the diff entirely instead
 * of racing the extension.
 */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function EyeIcon({ className = "" }: { className?: string }) {
  const mounted = useMounted();
  if (!mounted) return <span style={{ display: "inline-block", width: 20, height: 20 }} aria-hidden />;
  return <Eye size={20} className={className} aria-hidden />;
}

export function EyeCloseIcon({ className = "" }: { className?: string }) {
  const mounted = useMounted();
  if (!mounted) return <span style={{ display: "inline-block", width: 20, height: 20 }} aria-hidden />;
  return <EyeOff size={20} className={className} aria-hidden />;
}
