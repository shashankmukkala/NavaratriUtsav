"use client";

import { useEffect, useRef } from "react";
import { getMirrorSource, subscribeMirror } from "@/lib/mapMirror";

// How far past the panel's own edges to sample and draw, so the blur's soft
// edge falloff lands outside the panel (clipped by its overflow:hidden)
// instead of visibly darkening the last few blurred pixels inside it.
const MARGIN = 36;

// Drop this in as the first child of any element using .map-panel/.map-btn/
// .map-card — it renders behind the panel's own tint (z-index: -2, one level
// below the tint's -1) and paints a live, blurred copy of the map pixels
// directly behind that panel, refreshed every frame.
export default function GlassBlurLayer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!host || !canvas || !ctx) return;

    const panel = host.parentElement;
    if (!panel) return;

    const draw = () => {
      const source = getMirrorSource();
      if (!source) return;

      const panelRect = panel.getBoundingClientRect();
      const sourceRect = source.getBoundingClientRect();
      if (panelRect.width === 0 || panelRect.height === 0 || sourceRect.width === 0 || sourceRect.height === 0) return;

      // Scale the destination canvas by the map canvas's own measured ratio
      // (its buffer pixels per CSS pixel), not window.devicePixelRatio — on
      // displays with OS/browser scaling the two can diverge, and mixing
      // them stretched the mirrored image, reading as a "zoomed in" map.
      // Using one measured ratio for both source and destination keeps the
      // crop pixel-exact at any scaling.
      const scaleX = source.width / sourceRect.width;
      const scaleY = source.height / sourceRect.height;

      const targetW = Math.round((panelRect.width + MARGIN * 2) * scaleX);
      const targetH = Math.round((panelRect.height + MARGIN * 2) * scaleY);
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;
      const sx = (panelRect.left - MARGIN - sourceRect.left) * scaleX;
      const sy = (panelRect.top - MARGIN - sourceRect.top) * scaleY;
      const sw = (panelRect.width + MARGIN * 2) * scaleX;
      const sh = (panelRect.height + MARGIN * 2) * scaleY;

      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      } catch {
        // Source canvas mid-resize / not yet painted this frame — skip it.
      }
    };

    return subscribeMirror(draw);
  }, []);

  return (
    <div ref={hostRef} className="glass-blur-host" aria-hidden="true">
      <canvas ref={canvasRef} className="glass-blur-canvas" style={{ inset: -MARGIN }} />
    </div>
  );
}
