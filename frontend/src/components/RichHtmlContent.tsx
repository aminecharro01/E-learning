"use client";

import { useRef } from "react";
import { useResolveMediaAssets } from "@/lib/media";

type Props = {
  html: string;
  className?: string;
};

/**
 * Renders TipTap-saved HTML with the same typography as the editor.
 * Resolves img/video[data-asset-id] to signed stream URLs.
 */
export function RichHtmlContent({ html, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useResolveMediaAssets(ref, html);

  return (
    <div
      ref={ref}
      className={`rich-content text-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
