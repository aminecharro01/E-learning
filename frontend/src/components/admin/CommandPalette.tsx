"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GROUPS } from "@/components/admin/AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { searchCatalog } from "@/lib/api";
import type { SearchResultItem } from "@/types/domain";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const router = useRouter();
  const { isAdmin } = useAuth();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
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

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Palette de commandes"
      className="fixed left-1/2 top-24 z-[300] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-theme bg-surface"
      style={{ boxShadow: "var(--shadow-brand)" }}
      shouldFilter={false}
    >
      <div className="border-b border-theme px-3">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Rechercher une page, un module, une leçon…"
          className="w-full bg-transparent px-1 py-3 text-sm text-foreground outline-none placeholder:text-muted"
        />
      </div>
      <Command.List className="max-h-96 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
          Aucun résultat.
        </Command.Empty>

        <Command.Group heading="Navigation" className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {GROUPS.flatMap((group) => group.items)
            .filter((item) => !item.adminOnly || isAdmin)
            .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
            .map((item) => (
              <Command.Item
                key={item.path}
                value={item.name}
                onSelect={() => go(item.path)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface-2"
              >
                {item.icon}
                {item.name}
              </Command.Item>
            ))}
        </Command.Group>

        {results.length > 0 && (
          <Command.Group heading="Contenu" className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {results.map((item) => (
              <Command.Item
                key={`${item.type}-${item.id}`}
                value={item.title}
                onSelect={() => go(item.link)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface-2"
              >
                <span className="text-xs text-muted">{item.type === "MODULE" ? "Module" : "Leçon"}</span>
                {item.title}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
