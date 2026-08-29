import type { AuditLogEntryItem } from "@/types/domain";

type Props = {
  entries: AuditLogEntryItem[];
  actionLabel: (action: string) => string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Vertical timeline — a single center line (left-aligned on mobile, centered on
 * desktop) with entries alternating left/right of it. Each <li> is its own 2-col
 * grid at md+ with the card placed via col-start-1/2, so CSS Grid creates the
 * empty opposite cell automatically — no duplicate mobile/desktop rendering needed.
 */
export function AuditTimeline({ entries, actionLabel }: Props) {
  if (entries.length === 0) return null;

  return (
    <ol aria-label="Journal d'audit" className="relative">
      <span
        aria-hidden
        className="absolute left-4 top-2 bottom-2 w-px md:left-1/2"
        style={{ background: "var(--border)" }}
      />
      {entries.map((entry, i) => {
        const onRight = i % 2 === 1;
        return (
          <li
            key={entry.id}
            className="relative mb-5 pl-10 last:mb-0 md:grid md:grid-cols-2 md:gap-x-10 md:pl-0"
          >
            <span
              aria-hidden
              className="absolute left-4 top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 md:left-1/2"
              style={{ borderColor: "var(--primary)", backgroundColor: "var(--background)" }}
            />
            <div
              className={`card-theme rounded-xl p-3 ${onRight ? "md:col-start-2" : "md:col-start-1 md:text-right"}`}
            >
              <p className="text-xs text-muted">{formatDate(entry.createdAt)}</p>
              <p className="mt-0.5 text-sm font-semibold text-heading">{actionLabel(entry.action)}</p>
              <p className="text-xs text-muted">{entry.actorName}</p>
              {entry.targetType && (
                <p className="mt-1 text-xs text-muted">
                  Cible : {entry.targetName ?? entry.targetType}
                  {!entry.targetName && entry.targetId ? ` · ${entry.targetId}` : ""}
                </p>
              )}
              {entry.metadata && <p className="mt-1 break-words text-xs text-muted">{entry.metadata}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
