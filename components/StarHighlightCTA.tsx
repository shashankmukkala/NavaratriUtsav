"use client";

import { useState } from "react";
import AddStarModal from "@/components/AddStarModal";
import SignInPrompt from "@/components/SignInPrompt";
import { fetchJson } from "@/lib/fetchJson";
import type { Pandal } from "@/lib/types";

/** The actual payment entry point for the Star category tab — not just
 * text pointing people at their own listing's card, but a real button
 * that fetches the signed-in user's own listings and opens the payment
 * flow directly (picking one first if they have more than one eligible). */
export default function StarHighlightCTA({ starPrice }: { starPrice: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [eligible, setEligible] = useState<Pandal[] | null>(null);
  const [target, setTarget] = useState<Pandal | null>(null);

  const start = async () => {
    setError(null);
    setLoading(true);
    const result = await fetchJson<{ pandals: Pandal[] }>("/api/me/pandals");
    setLoading(false);
    if (!result) {
      // fetchJson collapses every non-OK response to null — the only
      // realistic failure here is the 401 this route returns when signed out.
      setShowSignIn(true);
      return;
    }
    const candidates = result.pandals.filter((p) => p.status === "approved" && !p.featured && !p.star_payment_proof_url);
    if (candidates.length === 0) {
      setError(
        result.pandals.length === 0
          ? "Add a celebration first, then you can highlight it."
          : "None of your celebrations are eligible right now (already starred, pending review, or not yet approved)."
      );
      return;
    }
    if (candidates.length === 1) {
      setTarget(candidates[0]);
      return;
    }
    setEligible(candidates);
  };

  return (
    <div className="mt-2 rounded-xl bg-[rgba(250,204,21,0.12)] p-3">
      <p className="text-xs text-[color:var(--muted)]">
        ★ Feature your own celebration here — one-time ₹{starPrice}, a glowing pin and card for good.
      </p>

      {eligible ? (
        <div className="mt-2 space-y-1.5">
          {eligible.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setTarget(p)}
              className="flex w-full items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-left text-xs font-semibold text-[color:var(--foreground)] transition-colors hover:bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbnail_url || p.image_url} alt="" className="h-6 w-6 flex-shrink-0 rounded-full object-cover" />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="btn-primary mt-2 w-full justify-center py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Checking…" : "Get a star"}
        </button>
      )}

      {error && <p className="mt-1.5 text-xs text-[color:var(--coral-deep)]">{error}</p>}

      <SignInPrompt
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        callbackUrl="/map"
        message="Sign in to feature one of your celebrations."
      />

      {target && <AddStarModal pandal={target} onClose={() => setTarget(null)} onSaved={() => setTarget(null)} />}
    </div>
  );
}
