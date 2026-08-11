import type { ReactNode } from "react";
import { Check } from "lucide-react";

export type StepStatus = "done" | "current" | "pending";

export function Stepper({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <ol className={`relative ${className}`}>{children}</ol>;
}

type StepProps = {
  status: StepStatus;
  title: ReactNode;
  isLast?: boolean;
  children?: ReactNode;
};

export function Step({ status, title, isLast = false, children }: StepProps) {
  const dotClass =
    status === "done"
      ? "bg-[var(--alert-success-bg)] text-[var(--success)]"
      : status === "current"
        ? "bg-[var(--primary)] text-[var(--primary-fg)]"
        : "bg-surface-2 text-muted";

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && (
        <span
          aria-hidden
          className="absolute bottom-0 left-[15px] top-8 w-px"
          style={{ background: "var(--border)" }}
        />
      )}
      <span
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${dotClass}`}
        aria-hidden
      >
        {status === "done" ? <Check size={14} aria-hidden /> : ""}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        {title}
        {children}
      </div>
    </li>
  );
}
