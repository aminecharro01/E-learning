"use client";

import { usePageProgress } from "./usePageProgress";

/** Thin gold bar at the very top of the viewport tracking scroll through the whole page — the "flight progress" callback to the hero's boarding-pass motif. */
export function RejoindreProgressBar() {
  const ref = usePageProgress<HTMLDivElement>();

  return (
    <div className="rejoindre-progress-track" aria-hidden="true">
      <div className="rejoindre-progress-fill" ref={ref} />
    </div>
  );
}
