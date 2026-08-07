"use client";

import { useMemo, useRef } from "react";
import DOMPurify from "dompurify";
import { useResolveMediaAssets } from "@/lib/media";

type Props = {
  html: string;
  className?: string;
};

/**
 * Renders TipTap-saved HTML with the same typography as the editor.
 * Resolves img/video[data-asset-id] to signed stream URLs.
 *
 * Sanitized with DOMPurify before render — this HTML is authored by admin/formateur
 * accounts via the block editor and shown to every learner who opens the lesson, so a
 * compromised or malicious author account must not be able to inject a stored XSS
 * payload that runs in every viewer's session.
 */
export function RichHtmlContent({ html, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ADD_TAGS: ["video", "source"],
        ADD_ATTR: ["data-asset-id", "target", "controls"],
      }),
    [html]
  );
  useResolveMediaAssets(ref, safeHtml);

  return (
    <div
      ref={ref}
      className={`rich-content text-body ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
