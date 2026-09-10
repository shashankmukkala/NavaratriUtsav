"use client";

import { useEffect, useState } from "react";
import { UsersIcon } from "@/components/icons";
import { fetchJson } from "@/lib/fetchJson";

const REFRESH_MS = 60_000;

/** Tiny "N people have visited" badge, floating in a top corner of the map —
 * purely a showcase number, refreshed on an interval so it stays current
 * without anyone needing to reload the page. */
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
    <div className="pointer-events-none fixed right-2 top-1 z-40 flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[0.625rem] font-medium text-[color:var(--muted)] shadow-sm backdrop-blur-sm">
      <UsersIcon className="h-2.5 w-2.5 flex-shrink-0" />
      {count.toLocaleString("en-IN")} visited
    </div>
  );
}
