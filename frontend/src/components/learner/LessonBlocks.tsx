"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PdfViewer } from "@/components/PdfViewer";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import type { LessonBlock } from "@/types/domain";

type Props = {
  blocks: LessonBlock[];
  lessonId: string;
  onVideoProgress?: (percent: number) => void;
};

export function LessonBlocks({ blocks, lessonId, onVideoProgress }: Props) {
  const reportProgress = useCallback(
    (percent: number) => {
      onVideoProgress?.(percent);
      if (percent % 5 !== 0 && percent < 90) return;
      api
        .post(`/api/progress/lessons/${lessonId}`, { videoWatchedPercent: percent })
        .catch(() => undefined);
    },
    [lessonId, onVideoProgress]
  );

  if (blocks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-theme px-4 py-10 text-center text-sm text-muted">
        Aucun contenu pour cette section.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {blocks.map((block) => (
        <div key={block.id}>
          {block.blockType === "TEXT" && (
            <RichHtmlContent html={String(block.content.body ?? block.content.text ?? "")} />
          )}
          {block.blockType === "VIDEO" && (
            <VideoPlayer
              assetId={block.content.assetId ? String(block.content.assetId) : undefined}
              title={String(block.content.title ?? "Vidéo pédagogique")}
              onProgress={reportProgress}
            />
          )}
          {block.blockType === "PDF" && (
            <PdfViewer
              assetId={block.content.assetId ? String(block.content.assetId) : undefined}
              title={String(block.content.title ?? "Document PDF")}
            />
          )}
          {block.blockType === "IMAGE" && typeof block.content.assetId === "string" && (
            <ImageBlock assetId={block.content.assetId} alt={String(block.content.alt ?? "")} />
          )}
        </div>
      ))}
    </div>
  );
}

function ImageBlock({ assetId, alt }: { assetId: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setUrl(null);
    setError(false);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    api
      .get<{ url: string }>(`/api/assets/${assetId}/stream`)
      .then((res) => {
        setUrl(res.data.url.startsWith("http") ? res.data.url : `${apiBase}${res.data.url}`);
      })
      .catch(() => setError(true));
  }, [assetId]);
  if (error) return <p className="alert alert-error">Impossible de charger l&apos;image.</p>;
  if (!url) return <p className="text-sm text-muted">Chargement image…</p>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="max-h-[520px] w-auto rounded-lg" onError={() => setError(true)} />;
}
