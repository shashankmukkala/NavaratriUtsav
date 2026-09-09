"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_ID_KEY = "bs_visitor_id";

// A random id kept in localStorage so repeat visits from the same browser
// can be told apart from new ones — no login or fingerprinting involved,
// just a value this browser hands back to itself next time.
function getVisitorId(): string | null {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies/storage) —
    // the visit still gets tracked, just without a visitor id attached.
    return null;
  }
}

/** Fires a page-view ping on mount and every route change — mounted once in
 * the root layout so it covers every page without each one wiring it up
 * itself. Renders nothing; failures are silently ignored (this is a nice-
 * to-have visit counter, not something worth ever showing an error for). */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, visitor_id: getVisitorId() }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
