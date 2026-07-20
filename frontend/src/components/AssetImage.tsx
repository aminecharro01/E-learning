"use client";

import { useEffect, useState } from "react";
import { resolveAssetUrl } from "@/lib/media";

type Props = {
  assetId: string;
  alt?: string;
  className?: string;
};

export function AssetImage({ assetId, alt = "", className = "" }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveAssetUrl(assetId)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (!url) {
    return <p className="text-xs text-muted">Chargement image…</p>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
