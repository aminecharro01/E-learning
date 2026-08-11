/** Minimal auth-form icon set, backed by lucide-react */

import { ChevronLeft, Eye, EyeOff } from "lucide-react";

export function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return <ChevronLeft size={20} className={className} aria-hidden />;
}

export function EyeIcon({ className = "" }: { className?: string }) {
  return <Eye size={20} className={className} aria-hidden />;
}

export function EyeCloseIcon({ className = "" }: { className?: string }) {
  return <EyeOff size={20} className={className} aria-hidden />;
}
