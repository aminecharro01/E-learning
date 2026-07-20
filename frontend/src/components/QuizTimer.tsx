"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Server-authoritative expiry timestamp (ISO or epoch ms). */
  expiresAt: string | number | null;
  onExpire?: () => void;
};

export function QuizTimer({ expiresAt, onExpire }: Props) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(null);
      return;
    }
    const end =
      typeof expiresAt === "number"
        ? expiresAt
        : Number.isFinite(Number(expiresAt))
          ? Number(expiresAt)
          : new Date(expiresAt).getTime();

    const tick = () => {
      const left = end - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) onExpire?.();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpire]);

  if (remainingMs === null) {
    return <span className="text-sm text-muted">Temps illimité</span>;
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = totalSec <= 60;

  return (
    <span className={`timer-badge ${urgent ? "timer-badge-urgent" : ""}`}>
      {mm}:{ss}
    </span>
  );
}
