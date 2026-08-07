"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { searchCatalog } from "@/lib/api";
import type { SearchResultItem } from "@/types/domain";
import { btn } from "@/lib/ui";

export function LearnerSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      searchCatalog(q)
        .then((items) => {
          if (!cancelled) setResults(items);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={btn.icon}
        aria-label="Rechercher"
        title="Rechercher"
        onClick={() => setOpen((v) => !v)}
      >
        🔍
      </button>

      {open && (
        <div
          className="card-theme absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl"
          style={{ boxShadow: "var(--shadow-brand)" }}
        >
          <div className="border-b border-theme p-2">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un module, une leçon…"
              className="input-theme"
            />
          </div>
          {query.trim().length >= 2 && (
            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 ? (
                <p className="px-4 py-4 text-center text-sm text-muted">Aucun résultat.</p>
              ) : (
                results.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.link}
                    className="flex flex-col gap-0.5 border-b border-theme px-4 py-2 text-sm last:border-b-0 hover:bg-surface-2"
                    onClick={() => setOpen(false)}
                  >
                    <span className="text-[11px] text-muted">{item.type === "MODULE" ? "Module" : "Leçon"}</span>
                    <span className="font-medium text-heading">{item.title}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
