"use client";

import { useEffect, useRef, useState } from "react";

type FogParticle = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
};

/**
 * Custom airplane cursor + soft fog trail for the landing page.
 * Desktop / fine pointer only; disabled for touch and reduced motion.
 */
export function AirplaneCursor() {
  const [enabled, setEnabled] = useState(false);
  const planeRef = useRef<HTMLDivElement>(null);
  const fogLayerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<FogParticle[]>([]);
  const nextId = useRef(0);
  const target = useRef({ x: -100, y: -100 });
  const current = useRef({ x: -100, y: -100 });
  const angle = useRef(-25);
  const lastFogAt = useRef(0);
  const visible = useRef(false);
  const raf = useRef(0);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    setEnabled(true);
    document.documentElement.classList.add("landing-cursor-active");

    const onMove = (event: MouseEvent) => {
      target.current.x = event.clientX;
      target.current.y = event.clientY;
      visible.current = true;
    };

    const onLeave = () => {
      visible.current = false;
    };

    const tick = (now: number) => {
      const dx = target.current.x - current.current.x;
      const dy = target.current.y - current.current.y;
      current.current.x += dx * 0.22;
      current.current.y += dy * 0.22;

      const speed = Math.hypot(dx, dy);
      if (speed > 0.4) {
        const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const delta = ((targetAngle - angle.current + 540) % 360) - 180;
        angle.current += delta * 0.12;
      }

      const plane = planeRef.current;
      if (plane) {
        plane.style.opacity = visible.current ? "1" : "0";
        plane.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) translate(-50%, -50%) rotate(${angle.current + 45}deg)`;
      }

      if (visible.current && speed > 1.2 && now - lastFogAt.current > 28) {
        lastFogAt.current = now;
        particlesRef.current.push({
          id: nextId.current++,
          x: current.current.x - Math.cos((angle.current * Math.PI) / 180) * 14,
          y: current.current.y - Math.sin((angle.current * Math.PI) / 180) * 14,
          size: 18 + Math.random() * 28,
          opacity: 0.28 + Math.random() * 0.22,
        });
        if (particlesRef.current.length > 28) {
          particlesRef.current = particlesRef.current.slice(-28);
        }
      }

      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          size: p.size * 1.035,
          opacity: p.opacity * 0.92,
          x: p.x - Math.cos((angle.current * Math.PI) / 180) * 0.35,
          y: p.y - Math.sin((angle.current * Math.PI) / 180) * 0.35,
        }))
        .filter((p) => p.opacity > 0.03);

      const fogLayer = fogLayerRef.current;
      if (fogLayer) {
        fogLayer.innerHTML = particlesRef.current
          .map(
            (p) =>
              `<span class="landing-cursor-fog" style="transform:translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%);width:${p.size}px;height:${p.size}px;opacity:${p.opacity}"></span>`
          )
          .join("");
      }

      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("landing-cursor-active");
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="landing-cursor" aria-hidden>
      <div ref={fogLayerRef} className="landing-cursor-fog-layer" />
      <div ref={planeRef} className="landing-cursor-plane">
        <svg viewBox="0 0 64 64" fill="currentColor" width="28" height="28">
          <path d="M32 6 40 26h18L40 38l6 18-14-10-14 10 6-18L6 26h18L32 6Z" />
        </svg>
      </div>
    </div>
  );
}
