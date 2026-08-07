type Props = {
  /** Sizing/shape utility classes, e.g. "h-56 rounded-2xl". */
  className?: string;
  /** Adds the card-theme surface/border look, matching card-shaped loading states. */
  card?: boolean;
};

export function Skeleton({ className = "h-24 rounded-2xl", card = false }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-surface-2 ${card ? "card-theme " : ""}${className}`}
    />
  );
}
