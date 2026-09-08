// backdrop-filter can't sample MapLibre's WebGL canvas in this app's target
// browsers (see the comment in globals.css) — so instead of relying on it,
// glass panels mirror the exact pixels behind them into their own <canvas>
// and blur that with a CSS `filter`, which always works. This module is the
// single point of contact between MapView (which owns the live map canvas)
// and every GlassBlurLayer consumer (which redraws from it every frame).
type Listener = () => void;

// Reading pixels back out of a WebGL canvas (what every GlassBlurLayer does
// each tick) forces a GPU pipeline stall — cheap once, expensive at a full
// 60fps across multiple panels. Capping the mirror to ~24fps keeps the blur
// visibly live during pan/zoom without hammering the GPU on every frame.
const MIN_INTERVAL_MS = 1000 / 24;

let sourceCanvas: HTMLCanvasElement | null = null;
const listeners = new Set<Listener>();
let rafId: number | null = null;
let lastTick = 0;

function tick(time: number) {
  if (time - lastTick >= MIN_INTERVAL_MS) {
    lastTick = time;
    for (const listener of listeners) listener();
  }
  rafId = sourceCanvas && listeners.size > 0 ? requestAnimationFrame(tick) : null;
}

function ensureLoop() {
  if (rafId == null && sourceCanvas && listeners.size > 0) {
    rafId = requestAnimationFrame(tick);
  }
}

export function setMirrorSource(canvas: HTMLCanvasElement | null) {
  sourceCanvas = canvas;
  ensureLoop();
}

export function getMirrorSource() {
  return sourceCanvas;
}

export function subscribeMirror(listener: Listener) {
  listeners.add(listener);
  ensureLoop();
  return () => {
    listeners.delete(listener);
  };
}
