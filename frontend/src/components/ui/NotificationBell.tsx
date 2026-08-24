"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { getMyNotifications, markNotificationRead } from "@/lib/api";
import type { AppNotification } from "@/types/domain";
import { toast } from "@/lib/toast-store";
import { btn } from "@/lib/ui";

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Guards against React Strict Mode's dev-only double-invoke of effects on mount:
    // without `cancelled`, two overlapping poll() calls can each see knownIds as not-yet-set
    // and both decide the same notification is "fresh", popping the same toast twice.
    let cancelled = false;

    async function poll() {
      try {
        const data = await getMyNotifications(0, 10);
        if (cancelled) return;
        setItems(data.page.content);
        setUnreadCount(data.unreadCount);

        if (knownIds.current) {
          const fresh = data.page.content.filter((n) => !n.read && !knownIds.current!.has(n.id));
          if (fresh.length === 1) {
            toast.info(fresh[0].title);
          } else if (fresh.length > 1) {
            toast.info(`${fresh.length} nouvelles notifications`);
          }
        }
        knownIds.current = new Set(data.page.content.map((n) => n.id));
      } catch {
        // Silent: the global api-client interceptor already surfaces a toast on failure.
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function onSelect(notification: AppNotification) {
    if (!notification.read) {
      setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationRead(notification.id).catch(() => undefined);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`${btn.icon} relative`}
        aria-label="Notifications"
        title="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-[var(--danger-fg)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="card-theme absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl"
          style={{ boxShadow: "var(--shadow-brand)" }}
        >
          <div className="border-b border-theme px-4 py-3">
            <p className="text-sm font-semibold text-heading">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">Aucune notification.</p>
            ) : (
              items.map((n) => {
                const content = (
                  <div className={`flex flex-col gap-0.5 px-4 py-3 ${n.read ? "" : "bg-surface-2"}`}>
                    <p className="text-sm font-medium text-heading">{n.title}</p>
                    {n.message && <p className="text-xs text-muted">{n.message}</p>}
                    <p className="text-[11px] text-muted">{timeAgo(n.createdAt)}</p>
                  </div>
                );
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    role="menuitem"
                    className="block border-b border-theme last:border-b-0 hover:bg-surface-2"
                    onClick={() => void onSelect(n)}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    className="block w-full border-b border-theme text-left last:border-b-0 hover:bg-surface-2"
                    onClick={() => void onSelect(n)}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
