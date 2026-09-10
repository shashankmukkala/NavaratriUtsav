"use client";

import { useEffect, useState } from "react";
import { UsersIcon } from "@/components/icons";
import { fetchJson } from "@/lib/fetchJson";

const REFRESH_MS = 60_000;

/** Tiny "N people have visited" badge — purely a showcase number, refreshed
 * on an interval so it stays current without anyone needing to reload.
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
    // more clearance than desktop's single-row nav-shell.
    <div className="pointer-events-none absolute right-3 top-32 z-10 flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[0.6875rem] font-medium text-[color:var(--muted)] shadow-sm backdrop-blur-sm lg:top-20">
      <UsersIcon className="h-3 w-3 flex-shrink-0" />
      {count.toLocaleString("en-IN")} visited
    </div>
  );
}
