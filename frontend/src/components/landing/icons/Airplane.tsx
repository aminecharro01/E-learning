type Props = {
  className?: string;
  ariaHidden?: boolean;
  style?: React.CSSProperties;
};

/** Minimal aviation silhouette for decorative use */
export function AirplaneIcon({ className = "", ariaHidden = true, style }: Props) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden={ariaHidden}
    >
      <path d="M32 4 38 22h18l-14 10 5 18-9-7-9 7 5-18L10 22h18L32 4Z" opacity="0.15" />
      <path d="M32 8 37 24h16l-12 9 4 15-8-6-8 6 4-15-12-9h16L32 8Zm0 6.2L29.4 22H18l9.8 7.2-3.7 13.5L32 38.8l7.9 3.9L36.2 29.2 46 22H34.6L32 14.2Z" />
    </svg>
  );
}

/** Recognizable top-down airplane silhouette, for large decorative use (unlike AirplaneIcon's sparkle glyph, this one actually reads as a plane at scale) */
export function AirplaneSilhouette({ className = "", ariaHidden = true, style }: Props) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={ariaHidden}
    >
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2.5 1.5V22l4-1 4 1v-1.5L13 19v-5.5z" />
    </svg>
  );
}

export function FlightPathDecor({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 400"
      fill="none"
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d="M0 320 C200 280 400 360 600 300 S1000 240 1200 280"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="8 12"
        opacity="0.35"
      />
      <path
        d="M0 200 C300 160 500 240 800 180 S1100 120 1200 160"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 10"
        opacity="0.2"
      />
    </svg>
  );
}
