"use client";

import { useEffect, useState } from "react";
import { getMyBadges, getMyLevel } from "@/lib/api";
import type { Badge } from "@/types/domain";

export function BadgeStrip() {
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    getMyBadges()
      .then(setBadges)
      .catch(() => setBadges([]));
    getMyLevel()
      .then((l) => setLevel(l.level))
      .catch(() => setLevel(null));
  }, []);

  if (!badges || badges.length === 0) return null;

  return (
    <div className="space-y-2">
      {level !== null && level > 0 && (
        <p className="text-xs font-semibold text-muted">Niveau {level}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {badges.map((b) => (
          <div
            key={b.code}
            title={b.earned ? b.description : `Non débloqué — ${b.description}`}
            className={`flex items-center gap-2 rounded-full border border-theme px-3 py-1.5 text-sm ${
              b.earned ? "bg-surface" : "bg-surface-2 opacity-50 grayscale"
            }`}
          >
            <span className="text-lg" aria-hidden>
              {b.icon}
            </span>
            <span className="font-medium text-heading">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
