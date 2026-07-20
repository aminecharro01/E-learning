"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import type { ReactNode } from "react";
import { btn, inputClass } from "@/lib/ui";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export type PageMeta = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type Props<T extends { id: string }> = {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Server-side pagination (omit for client-only tables). */
  pageMeta?: PageMeta | null;
  onPageChange?: (page: number) => void;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyMessage = "Aucune donnée.",
  onRowClick,
  onEdit,
  onDelete,
  search,
  onSearchChange,
  searchPlaceholder = "Rechercher…",
  pageMeta,
  onPageChange,
}: Props<T>) {
  const colCount = columns.length + (onEdit || onDelete ? 1 : 0);

  return (
    <div className="card-theme overflow-hidden rounded-2xl">
      {onSearchChange && (
        <div className="border-b border-theme p-4">
          <input
            type="search"
            name="table-search"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className={`${inputClass} max-w-sm`}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-surface-2">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-sm text-muted">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-sm text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              data.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={`transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--ring)] ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-body ${col.className ?? ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {onEdit && (
                          <button
                            type="button"
                            className={btn.secondaryXs}
                            onClick={() => onEdit(row)}
                          >
                            Éditer
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            className={btn.dangerXs}
                            onClick={() => onDelete(row)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pageMeta && onPageChange && pageMeta.totalPages > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-theme px-4 py-3 text-sm">
          <p className="text-muted">
            {pageMeta.totalElements} résultat{pageMeta.totalElements > 1 ? "s" : ""} — page{" "}
            {pageMeta.page + 1} / {Math.max(pageMeta.totalPages, 1)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pageMeta.page <= 0 || loading}
              onClick={() => onPageChange(pageMeta.page - 1)}
              className={btn.neutralXs}
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={pageMeta.page + 1 >= pageMeta.totalPages || loading}
              onClick={() => onPageChange(pageMeta.page + 1)}
              className={btn.neutralXs}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
