"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyAgenda } from "@/lib/api";
import type { AgendaItem } from "@/types/domain";

function formatAt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AgendaWidget() {
  const [items, setItems] = useState<AgendaItem[] | null>(null);

  useEffect(() => {
    getMyAgenda()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="card-theme rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-heading">À venir</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => {
          const row = (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-theme px-3 py-2 text-sm hover:bg-surface-2">
              <span className="text-foreground">{item.label}</span>
              <span className="shrink-0 text-xs text-muted">{formatAt(item.at)}</span>
            </div>
          );
          return <li key={index}>{item.link ? <Link href={item.link}>{row}</Link> : row}</li>;
        })}
      </ul>
    </div>
  );
}
