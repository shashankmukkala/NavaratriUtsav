"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

// Matches the endpoint's 5-minute CDN cache — polling faster would only
// re-download the same cached number.
const REFRESH_MS = 5 * 60_000;

/** Tiny "N visits" badge — total page loads, not deduped by visitor — purely
 * a showcase number, refreshed on an interval so it stays current without
 * anyone needing to reload.
 * Rendered as a child of the map's own container (not `fixed` to the
 * viewport) so it's positioned relative to the map card itself, clear of
 * the floating header — a `fixed` badge near the top edge risked sitting
 * behind real mobile browser chrome (address bar) or the header overlay. */
export default function VisitorCountBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchJson<{ count: number }>("/api/visitor-count").then((data) => {
        if (!cancelled && data) setCount(data.count);
      });
    };
    load();
    // Skip refreshes while the tab is in the background.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (count === null) return null;

  return (
    // Sits below the category chips on both layouts — on mobile they're the
    // header's third row, on desktop they float just under the single-row
    // nav-shell — so the badge never ends up hidden behind them. Dark pill + a
    // pulsing green dot reads as a "live" counter, distinct from the
    // light/cream chrome used everywhere else on the map.
    <div className="pointer-events-none absolute left-3 top-[11.75rem] z-10 flex items-center gap-1.5 rounded-full bg-[rgba(20,12,4,0.82)] px-2.5 py-1 text-[0.6875rem] font-semibold text-white shadow-sm backdrop-blur-sm lg:left-4 lg:top-[8.25rem]">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
      </span>
      {count.toLocaleString("en-IN")} visits
    </div>
  );
}
