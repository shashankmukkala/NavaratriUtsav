"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

const REFRESH_MS = 60_000;

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
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (count === null) return null;

  return (
    // Mobile's header is two rows (brand+location, then search) so it needs
    // more clearance than desktop's single-row nav-shell. Dark pill + a
    // pulsing green dot reads as a "live" counter, distinct from the
    // light/cream chrome used everywhere else on the map.
    <div className="pointer-events-none absolute left-3 top-32 z-10 flex items-center gap-1.5 rounded-full bg-[rgba(20,12,4,0.82)] px-2.5 py-1 text-[0.6875rem] font-semibold text-white shadow-sm backdrop-blur-sm lg:top-20">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
      </span>
      {count.toLocaleString("en-IN")} visits
    </div>
  );
}
