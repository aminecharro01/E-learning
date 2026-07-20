"use client";

import { useEffect } from "react";
import apiClient from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function uploadMedia(file: File, kind: "IMAGE" | "VIDEO") {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const { data } = await apiClient.post<{ id: string; filename: string; assetKind: string }>(
    "/api/assets/upload",
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function resolveAssetUrl(assetId: string): Promise<string> {
  const { data } = await apiClient.get<{ url: string }>(`/api/assets/${assetId}/stream`);
  return data.url.startsWith("http") ? data.url : `${API_BASE}${data.url}`;
}

/** Resolve data-asset-id on img/video inside a container (editor preview / learner view). */
export function useResolveMediaAssets(containerRef: React.RefObject<HTMLElement | null>, htmlKey: string) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    let cancelled = false;

    const nodes = root.querySelectorAll<HTMLImageElement | HTMLVideoElement>(
      "img[data-asset-id], video[data-asset-id]"
    );

    nodes.forEach((el) => {
      const assetId = el.getAttribute("data-asset-id");
      if (!assetId) return;
      resolveAssetUrl(assetId)
        .then((url) => {
          if (cancelled) return;
          if (el.tagName === "VIDEO") {
            (el as HTMLVideoElement).src = url;
          } else {
            (el as HTMLImageElement).src = url;
          }
        })
        .catch(() => undefined);
    });

    return () => {
      cancelled = true;
    };
  }, [containerRef, htmlKey]);
}
