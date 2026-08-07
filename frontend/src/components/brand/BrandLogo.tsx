"use client";

import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  /** Pass `null` (not `undefined`) to render just the mark with no wrapping link — a
   * default parameter can't distinguish "omitted" from "explicitly undefined". */
  href?: string | null;
  className?: string;
  /** Compact mark for dense headers */
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
};

/** Full crest aspect ≈ 1.3∶1 (transparent PNG). Height drives layout. */
const sizes = {
  sm: { height: 44, width: 57 },
  md: { height: 56, width: 73 },
  lg: { height: 80, width: 104 },
} as const;

export function BrandLogo({
  href = "/",
  className = "",
  size = "md",
  showWordmark = false,
}: BrandLogoProps) {
  const dim = sizes[size];
  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/logo.png"
        alt="IAT Academy"
        width={dim.width}
        height={dim.height}
        className="bg-transparent object-contain"
        style={{ height: dim.height, width: "auto" }}
        priority
      />
      {showWordmark ? (
        <span className="leading-tight">
          <span className="block font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-heading">
            IAT <span className="text-[var(--gold-600)]">Academy</span>
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            Aviation &amp; Tourisme
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return mark;
  if (href.startsWith("#")) {
    return (
      <a
        href={href}
        className="inline-flex shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        {mark}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      {mark}
    </Link>
  );
}
