"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";

interface BackButtonProps {
  className?: string;
}

/** Goes back to wherever the user actually came from (browser history),
 * instead of always jumping to a hardcoded page like /map. */
export default function BackButton({ className = "btn-secondary" }: BackButtonProps) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} className={className}>
      <ArrowLeftIcon className="h-4 w-4" />
      Back
    </button>
  );
}
