"use client";

import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** Compact mark for dense headers */
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
};

const sizes = {
  sm: { box: "h-9 w-9", img: 36 },
  md: { box: "h-11 w-11", img: 44 },
  lg: { box: "h-14 w-14", img: 56 },
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
      <span
        className={`relative ${dim.box} shrink-0 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--navy)_25%,transparent)] bg-[var(--bg-raised,#fff)]`}
      >
        <Image
          src="/brand/logo.png"
          alt="IAT Academy"
          width={dim.img}
          height={dim.img}
          className="object-contain p-0.5"
          priority
        />
      </span>
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
