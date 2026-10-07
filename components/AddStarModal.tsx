"use client";

import { useEffect, useState } from "react";
import ImageUploadField from "@/components/ImageUploadField";
import { CopyIcon } from "@/components/icons";
import { fetchJson, sendJson } from "@/lib/fetchJson";
import { UPI_FALLBACK } from "@/lib/siteMeta";
import type { Pandal, PaymentSettings } from "@/lib/types";

/** Same one-time payment-proof pattern as the association-banner add-on —
 * submits star_payment_proof_url, and admin approving it just flips
 * `featured` to true, same flag the free admin-picked milestone highlight
 * already uses. Surfaced from the map's detail card (not the profile page)
 * since that's where an owner actually sees their pin next to everyone
 * else's. */
export default function AddStarModal({ pandal, onClose, onSaved }: { pandal: Pandal; onClose: () => void; onSaved: () => void }) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upiCopied, setUpiCopied] = useState(false);

  useEffect(() => {
    fetchJson<{ settings: PaymentSettings }>("/api/settings").then((data) => setSettings(data?.settings ?? null));
  }, []);

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(settings?.upi_id || UPI_FALLBACK);
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked — the UPI ID is still right there to select.
    }
  };

  const handleSave = async () => {
    if (!proofUrl) return;
    setError(null);
    setSaving(true);
    const result = await sendJson(`/api/me/pandals/${pandal.id}`, { star_payment_proof_url: proofUrl }, "PATCH");
    setSaving(false);
    if (result.ok) {
      onSaved();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-elevated relative w-full max-w-sm p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(43,22,8,0.06)] text-sm text-[color:var(--muted)] hover:bg-[rgba(43,22,8,0.12)]"
        >
          ×
        </button>
        <p className="pr-8 text-lg font-bold text-[color:var(--foreground)]">Get a star for {pandal.name}</p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          One-time ₹{settings?.star_price ?? 99} — a glowing highlight on the map pin and card, for good.
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.18)] bg-white/50 p-3">
          {settings?.qr_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.qr_image_url}
              alt="Payment QR code"
              className="h-20 w-20 flex-shrink-0 rounded-lg border border-[rgba(43,22,8,0.12)] object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(43,22,8,0.12)] bg-white text-[0.6rem] text-[color:var(--muted-soft)]">
              QR code
            </div>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-mono font-semibold text-[color:var(--foreground)]">
              {settings?.upi_id || UPI_FALLBACK}
              <button
                type="button"
                onClick={copyUpiId}
                aria-label="Copy UPI ID"
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--muted-soft)] transition-colors hover:bg-[rgba(43,22,8,0.08)] hover:text-[color:var(--accent-deep)]"
              >
                <CopyIcon className="h-3.5 w-3.5" />
              </button>
              {upiCopied && <span className="text-xs font-medium text-green-700">Copied</span>}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">Scan or pay ₹{settings?.star_price ?? 99} to this UPI ID.</p>
          </div>
        </div>

        <div className="mt-4">
          <ImageUploadField label="Payment screenshot" folder="payment-proofs" required value={proofUrl} onChange={setProofUrl} />
        </div>

        {error && <p className="mt-3 text-sm text-[color:var(--coral-deep)]">{error}</p>}

        <button
          type="button"
          disabled={!proofUrl || saving}
          onClick={handleSave}
          className="btn-primary mt-4 w-full justify-center py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Submit for review"}
        </button>
      </div>
    </div>
  );
}
