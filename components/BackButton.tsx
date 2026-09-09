"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";

interface BackButtonProps {
  className?: string;
  /** When given, always navigates here instead of using browser history.
   * Needed on pages that can be landed on straight from a Google sign-in
   * redirect (e.g. profile) — browser history in that case still has
   * accounts.google.com in it, so a plain history.back() lands back on
   * Google instead of anywhere in this app. */
  fallbackHref?: string;
}

/** Goes back to wherever the user actually came from (browser history),
 * instead of always jumping to a hardcoded page like /map — unless
 * `fallbackHref` is given, in which case it always goes there instead. */
export default function BackButton({ className = "btn-secondary", fallbackHref }: BackButtonProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (fallbackHref ? router.push(fallbackHref) : router.back())}
      className={className}
      aria-label="Back"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </button>
  );
}
