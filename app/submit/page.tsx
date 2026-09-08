"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import ImageUploadField from "@/components/ImageUploadField";
import LocationPicker from "@/components/LocationPicker";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  MegaphoneIcon,
  PinIcon,
  VerifiedIcon,
} from "@/components/icons";
import { fetchJson, sendJson } from "@/lib/fetchJson";
import type { PaymentSettings } from "@/lib/types";

export default function SubmitPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [organizerName, setOrganizerName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [timingText, setTimingText] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const [bannerProofUrl, setBannerProofUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const previewDateLabel = (() => {
    if (!eventDate) return "";
    const d = new Date(eventDate + "T00:00:00");
    return Number.isNaN(d.getTime())
      ? eventDate
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
  })();

  useEffect(() => {
    fetchJson<{ settings: PaymentSettings }>("/api/settings").then((data) => setSettings(data?.settings ?? null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!location) {
      setError("Please set the pandal's location on the map.");
      return;
    }
    if (!imageUrl) {
      setError("Please upload a photo of the pandal.");
      return;
    }
    if (!address.trim()) {
      setError("Please fill in the address.");
      return;
    }

    setSubmitting(true);
    const result = await sendJson("/api/pandals", {
      name: organizerName,
      organizer_name: organizerName,
      contact_phone: contactPhone,
      address,
      lat: location.lat,
      lng: location.lng,
      event_date: eventDate,
      timing_text: timingText,
      description: description || null,
      image_url: imageUrl,
      banner_image_urls: bannerUrls,
      banner_payment_proof_url: bannerProofUrl,
    });
    setSubmitting(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error);
    }
  };

  useEffect(() => {
    if (!done) return;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.6 } });
      confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.6 } });
    });
  }, [done]);

  return (
    <div
      className="min-h-dvh w-full"
      style={{
        background:
          "radial-gradient(ellipse 70% 45% at 15% 0%, rgba(244,169,60,0.28), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 8%, rgba(234,108,29,0.18), transparent 55%), linear-gradient(180deg, var(--cream-50), var(--cream-200) 45%, var(--cream-100))",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        <nav className="nav-shell flex items-center gap-4 px-4 py-2.5 sm:px-5">
          <Link href="/map" className="btn-secondary">
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Link>
          <Brand />
        </nav>

        {done && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="card-elevated flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
              <span className="icon-tile icon-tile-circle h-16 w-16">
                <CheckCircleIcon className="h-8 w-8" />
              </span>
              <h1 className="text-xl font-bold text-[color:var(--foreground)]">
                Your Mandapam has been added to the map!
              </h1>
              <p className="text-sm text-[color:var(--muted)]">
                We&apos;ll review it and it&apos;ll go live shortly. Together, we can help more people find food and
                feel the blessings of Bappa.
              </p>

              <div className="mt-2 w-full rounded-2xl border-2 border-dashed border-[rgba(234,108,29,0.3)] bg-white/50 p-4 text-left">
                <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                  <MegaphoneIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
                  Want to showcase your banner?
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Pay a one-time fee of ₹200 to unlock a banner on your card, for good.
                </p>
              </div>

              <Link href="/map" className="btn-primary mt-2 w-full justify-center">
                Back to Map
              </Link>
            </div>
          </div>
        )}

        {!done && (
          <div className="grid gap-10 pt-8 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12 lg:pt-16">
            <form onSubmit={handleSubmit} className="card-elevated space-y-5 p-5 sm:p-7 lg:order-1">
              <ImageUploadField label="Photo of the pandal" folder="pandals" required value={imageUrl} onChange={setImageUrl} />

              <Field label="Association name" required>
                <input
                  required
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="e.g. Balapur Youth Ganesh Mandal"
                  className="field-input"
                />
              </Field>

              <Field label="Contact phone" required>
                <input
                  required
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="field-input"
                />
              </Field>

              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                  Location <span className="text-[color:var(--accent-deep)]">*</span>
                </label>
                <LocationPicker
                  onChange={(loc) => {
                    setLocation(loc);
                    setAddress(loc.address);
                  }}
                />
              </div>

              <Field label="Location / Address" required>
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Street, area, landmark, city"
                  className="field-input"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" required>
                  <input
                    required
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="field-input"
                  />
                </Field>
                <Field label="Serving time" required>
                  <input
                    required
                    value={timingText}
                    onChange={(e) => setTimingText(e.target.value)}
                    placeholder="12 PM – 3 PM"
                    className="field-input"
                  />
                </Field>
              </div>

              <Field label="Additional details (optional)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Menu, special notes, seating capacity, etc."
                  className="field-input"
                />
              </Field>

              {error && <p className="text-sm text-[color:var(--coral-deep)]">{error}</p>}

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? "Submitting…" : "Submit — it's free"}
              </button>
              <p className="text-center text-xs text-[color:var(--muted-soft)]">
                Listing your Annadhanam costs nothing. The ₹200 banner on the right is a separate, optional add-on.
              </p>
            </form>

            <div className="min-w-0 space-y-6 lg:sticky lg:top-8 lg:order-2">
              <div>
                <p className="eyebrow">Add Seva</p>
                <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-4xl">
                  Let the people know. Let the seva grow.
                </h1>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
                    Takes two minutes
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <VerifiedIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
                    Quick review
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <PinIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
                    Reaches people nearby
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-soft)]">
                  This is how it&apos;ll look
                </p>
                <LivePreviewCard
                  imageUrl={imageUrl}
                  name={organizerName}
                  address={address}
                  dateLabel={previewDateLabel}
                  timingText={timingText}
                  bannerUrls={bannerUrls}
                  onBannerChange={setBannerUrls}
                  proofUrl={bannerProofUrl}
                  onProofChange={setBannerProofUrl}
                  settings={settings}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
        {label}
        {required && <span className="text-[color:var(--accent-deep)]"> *</span>}
      </label>
      {children}
    </div>
  );
}

/** A skeleton that fills in with real content as the form is filled — a
 * vertical mini version of the real pandal detail card, so it actually
 * shows what the listing will look like once approved, not just a row of
 * text. */
function LivePreviewCard({
  imageUrl,
  name,
  address,
  dateLabel,
  timingText,
  bannerUrls,
  onBannerChange,
  proofUrl,
  onProofChange,
  settings,
}: {
  imageUrl: string | null;
  name: string;
  address: string;
  dateLabel: string;
  timingText: string;
  bannerUrls: string[];
  onBannerChange: (urls: string[]) => void;
  proofUrl: string | null;
  onProofChange: (url: string | null) => void;
  settings: PaymentSettings | null;
}) {
  return (
    <div className="card-elevated max-w-md overflow-hidden">
      <div className="relative h-48 w-full bg-[rgba(43,22,8,0.06)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CameraIcon className="h-9 w-9 text-[color:var(--muted-soft)]" />
          </div>
        )}
        <span className="badge-live absolute left-3 top-3">Serving Now</span>
      </div>

      <div className="space-y-2.5 p-5">
        {name ? (
          <p className="truncate text-base font-bold text-[color:var(--foreground)]">{name}</p>
        ) : (
          <div className="h-4 w-2/3 animate-pulse rounded bg-[rgba(43,22,8,0.1)]" />
        )}

        {address ? (
          <p className="flex items-start gap-1.5 text-sm text-[color:var(--muted)]">
            <PinIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[color:var(--accent-deep)]" />
            <span className="line-clamp-2">{address}</span>
          </p>
        ) : (
          <div className="h-3 w-full animate-pulse rounded bg-[rgba(43,22,8,0.07)]" />
        )}

        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-sm font-medium text-[color:var(--accent-deep)]">
          {dateLabel && (
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateLabel}
            </span>
          )}
          {timingText && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {timingText}
            </span>
          )}
          {!dateLabel && !timingText && <div className="h-3 w-1/3 animate-pulse rounded bg-[rgba(43,22,8,0.07)]" />}
        </div>
      </div>

      <div className="border-t border-[rgba(43,22,8,0.1)] p-5 pt-4">
        <BannerUploader value={bannerUrls} onChange={onBannerChange} max={2} />

        {bannerUrls.length === 0 ? (
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            Optional, not required to list — a one-time ₹200 unlocks a banner on this card for good.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.18)] bg-white/50 p-3">
              {settings?.qr_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.qr_image_url} alt="Payment QR code" className="h-20 w-20 flex-shrink-0 rounded-lg border border-[rgba(43,22,8,0.12)] object-cover" />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(43,22,8,0.12)] bg-white text-[0.6rem] text-[color:var(--muted-soft)]">
                  QR code
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-mono font-semibold text-[color:var(--foreground)]">
                  {settings?.upi_id ?? "annadhanam@upi"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">Scan or pay ₹200 to this UPI ID.</p>
              </div>
            </div>

            <ImageUploadField
              label="Payment screenshot"
              folder="payment-proofs"
              required
              value={proofUrl}
              onChange={onProofChange}
            />

            {proofUrl && (
              <p className="text-xs text-[color:var(--muted)]">
                Got it — submit the form below. We&apos;ll verify and turn your banner on.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A single rectangular upload slot — spans the full card width, matching
 * the shape the banner actually renders in — that accepts up to `max`
 * images: already-added ones stack above one "add" tile that stays until
 * the limit is reached. */
function BannerUploader({ value, onChange, max }: { value: string[]; onChange: (urls: string[]) => void; max: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "pandals");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      onChange([...value, data.url]);
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
        className="hidden"
      />

      {value.map((url, i) => (
        <div key={url} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-20 w-full rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70"
          >
            ×
          </button>
        </div>
      ))}

      {value.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.18)] bg-white/50 text-xs font-medium text-[color:var(--muted)] hover:border-[rgba(234,108,29,0.5)]"
        >
          <CameraIcon className="h-4 w-4" />
          {uploading
            ? "Uploading…"
            : value.length === 0
              ? "Add your association banner"
              : `Add another (${value.length}/${max})`}
        </button>
      )}
    </div>
  );
}
