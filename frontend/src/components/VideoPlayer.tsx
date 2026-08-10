"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { api } from "@/lib/api";

type Props = {
  assetId?: string;
  src?: string;
  title?: string;
  onProgress?: (percent: number) => void;
};

/**
 * HLS / progressive video player — or Bunny Stream's own hosted player when the
 * resolved URL is a Bunny iframe embed (see MediaService#signStream on the backend).
 * If assetId is provided, fetches a signed stream URL from the API.
 */
export function VideoPlayer({ assetId, src, title, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(src ?? null);

  useEffect(() => {
    if (!assetId) {
      setResolvedUrl(src ?? null);
      return;
    }
    let cancelled = false;
    api
      .get<{ url: string }>(`/api/assets/${assetId}/stream`)
      .then(({ data }) => {
        if (cancelled) return;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        setResolvedUrl(data.url.startsWith("http") ? data.url : `${apiBase}${data.url}`);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [assetId, src]);

  const isBunnyEmbed = resolvedUrl?.includes("iframe.mediadelivery.net") ?? false;

  useEffect(() => {
    if (isBunnyEmbed || !resolvedUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (resolvedUrl.includes(".m3u8") && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);
    } else {
      video.src = resolvedUrl;
    }

    const onTimeUpdate = () => {
      if (!video.duration || !onProgress) return;
      onProgress(Math.min(100, Math.round((video.currentTime / video.duration) * 100)));
    };
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      hls?.destroy();
    };
  }, [resolvedUrl, isBunnyEmbed, onProgress]);

  return (
    <div className="media-viewer overflow-hidden bg-black">
      {title && <p className="media-viewer-title">{title}</p>}
      {isBunnyEmbed ? (
        <iframe
          src={resolvedUrl ?? undefined}
          title={title || "Vidéo"}
          className="aspect-video w-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      ) : (
        <video ref={videoRef} controls playsInline className="aspect-video w-full" />
      )}
    </div>
  );
}
