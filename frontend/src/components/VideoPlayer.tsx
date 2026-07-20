"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { api } from "@/lib/api";

type Props = {
  assetId?: string;
  src?: string;
  title?: string;
  onProgress?: (percent: number) => void;
};

/**
 * HLS / progressive video player.
 * If assetId is provided, fetches a signed stream URL from the API.
 */
export function VideoPlayer({ assetId, src, title, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let cancelled = false;

    async function attach() {
      let url = src;
      if (assetId) {
        const { data } = await api.get<{ url: string }>(`/api/assets/${assetId}/stream`);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        url = data.url.startsWith("http") ? data.url : `${apiBase}${data.url}`;
      }
      if (!url || cancelled || !video) return;

      if (url.includes(".m3u8") && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (url.includes(".m3u8") && video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else {
        video.src = url;
      }
    }

    attach().catch(() => undefined);

    const onTimeUpdate = () => {
      if (!video.duration || !onProgress) return;
      onProgress(Math.min(100, Math.round((video.currentTime / video.duration) * 100)));
    };
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      cancelled = true;
      video.removeEventListener("timeupdate", onTimeUpdate);
      hls?.destroy();
    };
  }, [assetId, src, onProgress]);

  return (
    <div className="media-viewer overflow-hidden bg-black">
      {title && <p className="media-viewer-title">{title}</p>}
      <video ref={videoRef} controls playsInline className="aspect-video w-full" />
    </div>
  );
}
