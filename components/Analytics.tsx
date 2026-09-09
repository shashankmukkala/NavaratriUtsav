"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
