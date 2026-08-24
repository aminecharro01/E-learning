"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { GraduationCap, IdCard, MessageCircle, Trophy } from "lucide-react";
import { getMyBadges, getMyLevel } from "@/lib/api";
import type { Badge } from "@/types/domain";
import { IconBadge, IconSuitcase } from "@/components/brand/IatIcons";

/** Chaque code de badge (voir BadgeCode côté backend) a une icône dédiée — celles déjà
 * dans le thème aviation de l'académie quand elles existent (stage), lucide sinon. */
const BADGE_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  FIRST_MODULE: GraduationCap,
  PERFECT_QUIZ: Trophy,
  STAGE_VALIDATED: IconSuitcase,
  PROFILE_COMPLETE: IdCard,
  FORUM_CONTRIBUTOR: MessageCircle,
};

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
        {badges.map((b) => {
          const Icon = BADGE_ICONS[b.code] ?? IconBadge;
          return (
            <div
              key={b.code}
              title={b.earned ? b.description : `Non débloqué — ${b.description}`}
              className={`flex items-center gap-2 rounded-full border border-theme py-1.5 pl-1.5 pr-3 text-sm ${
                b.earned ? "bg-surface" : "bg-surface-2 opacity-50 grayscale"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  b.earned ? "bg-[var(--primary)] text-[var(--primary-fg)]" : "bg-surface-2 text-muted"
                }`}
              >
                <Icon size={15} aria-hidden />
              </span>
              <span className="font-medium text-heading">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
