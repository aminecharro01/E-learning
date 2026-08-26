"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { btn } from "@/lib/ui";
import { Loader } from "@/components/ui/Loader";

const VIEWPORT_SIZE = 288;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type Props = {
  file: File | null;
  busy?: boolean;
  onCancel: () => void;
  onCropped: (file: File) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Fixed 1:1 viewport the user pans/zooms the photo behind (like most avatar
 * croppers) rather than a movable crop rectangle - simpler to build and to use
 * for a single square output, no extra dependency needed for that shape.
 */
export function AvatarCropModal({ file, busy, onCancel, onCropped }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!file) {
      setImgSrc(null);
      setNatural(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    if (file) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [file, onCancel]);

  const baseScale = natural ? VIEWPORT_SIZE / Math.min(natural.w, natural.h) : 1;
  const displayScale = baseScale * zoom;
  const displayW = natural ? natural.w * displayScale : VIEWPORT_SIZE;
  const displayH = natural ? natural.h * displayScale : VIEWPORT_SIZE;
  const bounds = useMemo(
    () => ({
      minX: VIEWPORT_SIZE - displayW,
      maxX: 0,
      minY: VIEWPORT_SIZE - displayH,
      maxY: 0,
    }),
    [displayW, displayH]
  );

  function clampPos(x: number, y: number) {
    return {
      x: clamp(x, bounds.minX, bounds.maxX),
      y: clamp(y, bounds.minY, bounds.maxY),
    };
  }

  function onImageLoad() {
    const el = imgRef.current;
    if (!el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setNatural({ w, h });
    const scale = VIEWPORT_SIZE / Math.min(w, h);
    setPos({ x: (VIEWPORT_SIZE - w * scale) / 2, y: (VIEWPORT_SIZE - h * scale) / 2 });
  }

  /** Keeps whatever's currently centered in the viewport still centered after the
   * zoom change, instead of drifting toward the image's top-left corner. */
  function onZoomChange(next: number) {
    if (!natural) {
      setZoom(next);
      return;
    }
    const newScale = baseScale * next;
    const centerNaturalX = (VIEWPORT_SIZE / 2 - pos.x) / displayScale;
    const centerNaturalY = (VIEWPORT_SIZE / 2 - pos.y) / displayScale;
    const newDisplayW = natural.w * newScale;
    const newDisplayH = natural.h * newScale;
    setZoom(next);
    setPos({
      x: clamp(VIEWPORT_SIZE / 2 - centerNaturalX * newScale, VIEWPORT_SIZE - newDisplayW, 0),
      y: clamp(VIEWPORT_SIZE / 2 - centerNaturalY * newScale, VIEWPORT_SIZE - newDisplayH, 0),
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const { startX, startY, startPosX, startPosY } = dragRef.current;
    setPos(clampPos(startPosX + (e.clientX - startX), startPosY + (e.clientY - startY)));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onConfirm() {
    const el = imgRef.current;
    if (!el || !natural) return;
    const sx = -pos.x / displayScale;
    const sy = -pos.y / displayScale;
    const sSize = VIEWPORT_SIZE / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(el, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCropped(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  if (!file || !imgSrc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={busy ? undefined : onCancel} />
      <div className="card-theme relative w-full max-w-sm rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-heading">Recadrer la photo</h2>
        <p className="mt-1 text-xs text-muted">Déplacez et zoomez pour choisir la zone à afficher (carré 1:1).</p>

        <div
          className="relative mx-auto mt-4 touch-none select-none overflow-hidden rounded-full bg-surface-2 ring-2 ring-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, cursor: dragRef.current ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imgSrc}
            alt=""
            onLoad={onImageLoad}
            draggable={false}
            className="absolute left-0 top-0 max-w-none"
            style={{ width: displayW, height: displayH, transform: `translate(${pos.x}px, ${pos.y}px)` }}
          />
        </div>

        <label className="mt-4 flex items-center gap-3 text-xs text-muted">
          <span>Zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="flex-1"
            aria-label="Niveau de zoom"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={btn.neutral} onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button type="button" className={btn.primary} onClick={onConfirm} disabled={busy || !natural}>
            {busy && <Loader size="sm" tone="current" />}
            {busy ? "Envoi…" : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}
