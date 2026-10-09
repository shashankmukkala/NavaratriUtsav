"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import Brand from "@/components/Brand";
import ImageUploadField from "@/components/ImageUploadField";
import MultiImageUploadField from "@/components/MultiImageUploadField";
import LocationPicker from "@/components/LocationPicker";
import ProfileNavLink from "@/components/ProfileNavLink";
import SignInPrompt from "@/components/SignInPrompt";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  PinIcon,
  UserIcon,
  VerifiedIcon,
} from "@/components/icons";
import { formatEventDateRange } from "@/lib/eventStatus";
import { UPI_FALLBACK } from "@/lib/siteMeta";
import { fetchJsonCached, sendJson } from "@/lib/fetchJson";
import { CATEGORIES, categoryInfo, isListingCategory } from "@/lib/categories";
import type { ListingCategory, PaymentSettings } from "@/lib/types";

const DRAFT_KEY = "utsav_submit_draft";

interface SubmitDraft {
  category: ListingCategory;
  name: string;
  organizerName: string;
  contactPhone: string;
  eventDate: string;
  eventDateEnd: string;
  timingText: string;
  description: string;
  imageUrl: string | null;
  location: { lat: number; lng: number; address: string } | null;
  address: string;
}

// Reads (and clears) the form draft saved right before being sent off to
// Google to sign in, so a first-time submitter doesn't lose their form.
// Must be read in an effect, not a lazy useState initializer — a lazy
// initializer still runs during the client's first (hydration) render, so
// reading sessionStorage there produces different output than the server's
// render (which always sees an empty form) and trips a hydration mismatch.
function readSubmitDraft(): SubmitDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(DRAFT_KEY);
    return JSON.parse(raw) as SubmitDraft;
  } catch {
    return null;
  }
}

export default function SubmitPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [name, setName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDateEnd, setEventDateEnd] = useState("");
  const [timingText, setTimingText] = useState("");
  const [category, setCategory] = useState<ListingCategory>("pandal");
  // Opened from a homepage "Feature your celebration" slot (?featured=1) —
  // the star highlight is paid alongside the listing instead of later.
  const [wantsFeatured, setWantsFeatured] = useState(false);
  const [starProofUrl, setStarProofUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [extraImageUrls, setExtraImageUrls] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<{ user?: { name?: string } } | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    // Read once on mount rather than via useSearchParams, which would force
    // the whole page into a Suspense boundary just for this one flag.
    const params = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (params.get("featured") === "1") setWantsFeatured(true);
    const cat = params.get("category");
    if (isListingCategory(cat)) setCategory(cat);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const draft = readSubmitDraft();
    if (!draft) return;
    // Restoring a draft from sessionStorage (an external system) after the
    // sign-in redirect — exactly the case this lint rule allows an effect
    // to opt out of.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (draft.category) setCategory(draft.category);
    setName(draft.name);
    setOrganizerName(draft.organizerName);
    setContactPhone(draft.contactPhone);
    setEventDate(draft.eventDate);
    setEventDateEnd(draft.eventDateEnd);
    setTimingText(draft.timingText);
    setDescription(draft.description);
    setImageUrl(draft.imageUrl);
    setLocation(draft.location);
    setAddress(draft.address);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const previewDateLabel = formatEventDateRange(eventDate || null, eventDateEnd || null);

  useEffect(() => {
    fetchJsonCached<{ settings: PaymentSettings }>("/api/settings").then((data) => setSettings(data?.settings ?? null));
  }, []);

  useEffect(() => {
    fetchJsonCached<{ user?: { name?: string } }>("/api/auth/session").then((data) => setSession(data ?? null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please fill in the name.");
      return;
    }
    if (!location) {
      setError("Please set the location on the map.");
      return;
    }
    if (!imageUrl) {
      setError("Please upload a cover photo.");
      return;
    }
    if (!address.trim()) {
      setError("Please fill in the address.");
      return;
    }
    if (wantsFeatured && !starProofUrl) {
      setError("Please upload the featured-listing payment screenshot, or untick \"Feature this celebration\".");
      return;
    }

    if (!session?.user) {
      const draft: SubmitDraft = {
        category,
        name,
        organizerName,
        contactPhone,
        eventDate,
        eventDateEnd,
        timingText,
        description,
        imageUrl,
        location,
        address,
      };
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Storage unavailable (private mode etc.) — sign-in still works,
        // the form just won't survive the redirect.
      }
      setShowSignIn(true);
      return;
    }

    setSubmitting(true);
    const result = await sendJson("/api/pandals", {
      name,
      organizer_name: organizerName,
      contact_phone: contactPhone,
      address,
      lat: location.lat,
      lng: location.lng,
      event_date: eventDate || null,
      event_date_end: eventDateEnd || null,
      timing_text: timingText || null,
      description: description || null,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      extra_image_urls: extraImageUrls,
      category,
      star_payment_proof_url: wantsFeatured ? starProofUrl : null,
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
    <div className="theme-wine w-full">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        <nav className="nav-shell flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-4">
            <BackButton />
            <Brand />
          </div>
          <ProfileNavLink />
        </nav>

        {done && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="card-elevated flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
              <span className="icon-tile icon-tile-circle h-16 w-16">
                <CheckCircleIcon className="h-8 w-8" />
              </span>
              <h1 className="text-xl font-bold text-[color:var(--foreground)]">
                Your {categoryInfo(category).label} has been added to the map!
              </h1>
              <p className="text-sm text-[color:var(--muted)]">
                We&apos;ll review it and it&apos;ll go live shortly. Together, we can help more people find the
                celebrations happening around them this Navaratri.
              </p>

              <Link href="/map" className="btn-secondary mt-2 self-start">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to map
              </Link>
            </div>
          </div>
        )}

        <SignInPrompt
          open={showSignIn}
          onClose={() => setShowSignIn(false)}
          callbackUrl="/submit"
          message="We use your Google account just to know who added this, so you can get help editing it later — no accounts of our own to manage."
        />

        {!done && (
          <div className="pt-8 lg:pt-16">
            <div className="mb-8 max-w-2xl">
              <p className="eyebrow">Add a Celebration</p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-4xl">
                Pandal, dandiya night or workshop — put it on the map.
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

          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12">
            <form onSubmit={handleSubmit} className="card-elevated space-y-5 p-5 sm:p-7 lg:order-1">
              <Field label="What are you adding?" required>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={`filter-chip justify-center whitespace-normal text-center leading-tight ${category === opt.value ? "filter-chip-active" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <ImageUploadField
                label={categoryInfo(category).photoLabel}
                folder="pandals"
                required
                value={imageUrl}
                onChange={setImageUrl}
                onThumbnailChange={setThumbnailUrl}
                aspect={16 / 9}
              />

              <MultiImageUploadField
                label="More photos (optional)"
                hint="Up to 3 more, alongside the cover photo above — shown as a gallery on the listing's card."
                folder="pandals"
                max={3}
                value={extraImageUrls}
                onChange={setExtraImageUrls}
                aspect={16 / 9}
              />

              <Field label="Name" required>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={categoryInfo(category).namePlaceholder}
                  className="field-input"
                />
              </Field>

              <Field label="Organizer / association name" required>
                <input
                  required
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder={categoryInfo(category).organizerPlaceholder}
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
                <p className="mt-1 text-xs text-[color:var(--muted)]">Shown on your listing so visitors can call you.</p>
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

              <Field label="Address (from the map pin above)" required>
                <textarea
                  required
                  readOnly
                  value={address}
                  rows={2}
                  placeholder="Drag the pin or search above to set this"
                  className="field-input cursor-not-allowed bg-[rgba(43,22,8,0.04)] text-[color:var(--muted)]"
                />
                <p className="mt-1 text-xs text-[color:var(--muted-soft)]">
                  This always matches the pin — so &quot;Get Directions&quot; on the live listing takes people to the
                  right place. To change it, move the pin or search a different spot above.
                </p>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Event date">
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="field-input" />
                </Field>
                <Field label="Timings">
                  <input
                    value={timingText}
                    onChange={(e) => setTimingText(e.target.value)}
                    placeholder="7 PM – 11 PM"
                    className="field-input"
                  />
                </Field>
              </div>
              <p className="-mt-2 text-xs text-[color:var(--muted-soft)]">
                When does it happen? Leave blank if it runs throughout the festival.
              </p>

              {eventDate && (
                <Field label="Ends on (optional — for multiple days)">
                  <input
                    type="date"
                    min={eventDate}
                    value={eventDateEnd}
                    onChange={(e) => setEventDateEnd(e.target.value)}
                    className="field-input"
                  />
                  <p className="mt-1 text-xs text-[color:var(--muted-soft)]">
                    Running across several nights? Set the last day here — leave blank for just the one day above.
                  </p>
                </Field>
              )}

              <Field label="Additional details (optional)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Entry fee, dress code, DJ / live band, special notes, etc."
                  className="field-input"
                />
              </Field>

              <FeatureOption
                checked={wantsFeatured}
                onCheckedChange={setWantsFeatured}
                proofUrl={starProofUrl}
                onProofChange={setStarProofUrl}
                settings={settings}
              />

              {error && <p className="text-sm text-[color:var(--coral-deep)]">{error}</p>}

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? "Submitting…" : "Submit — it's free"}
              </button>
              <p className="text-center text-xs text-[color:var(--muted-soft)]">
                Listing your celebration costs nothing.
              </p>
            </form>

            <div className="min-w-0 lg:sticky lg:top-8 lg:order-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-soft)]">
                This is how it&apos;ll look
              </p>
              <LivePreviewCard
                imageUrl={imageUrl}
                name={name}
                organizerName={organizerName}
                category={category}
                address={address}
                dateLabel={previewDateLabel}
                timingText={timingText}
              />
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Optional paid "featured" add-on — the same star highlight an owner can
 * buy later from the map's detail card (AddStarModal), offered up front here
 * so the homepage's Featured Celebrations slots link straight into it. */
function FeatureOption({
  checked,
  onCheckedChange,
  proofUrl,
  onProofChange,
  settings,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  proofUrl: string | null;
  onProofChange: (url: string | null) => void;
  settings: PaymentSettings | null;
}) {
  const price = settings?.star_price ?? 99;
  const upiId = settings?.upi_id || UPI_FALLBACK;

  return (
    <div className="rounded-2xl border-2 border-dashed border-[rgba(184,50,31,0.4)] bg-[rgba(184,50,31,0.04)] p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[color:var(--accent-deep)]"
        />
        <span>
          <span className="block text-sm font-semibold text-[color:var(--foreground)]">
            Feature this celebration — ₹{price}
          </span>
          <span className="mt-0.5 block text-xs text-[color:var(--muted)]">
            Shows it in Featured Celebrations on the homepage, with a glowing pin on the map. Optional.
          </span>
        </span>
      </label>

      {checked && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(43,22,8,0.12)] bg-white/60 p-3">
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
              <p className="font-mono text-sm font-semibold text-[color:var(--foreground)]">{upiId}</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">Scan or pay ₹{price} to this UPI ID, then upload the screenshot.</p>
            </div>
          </div>
          <ImageUploadField label="Payment screenshot" folder="payment-proofs" required value={proofUrl} onChange={onProofChange} />
        </div>
      )}
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
  organizerName,
  category,
  address,
  dateLabel,
  timingText,
}: {
  imageUrl: string | null;
  name: string;
  organizerName: string;
  category: ListingCategory;
  address: string;
  dateLabel: string;
  timingText: string;
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
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${categoryInfo(category).badgeClass}`}>
          {categoryInfo(category).label}
        </span>
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

        {organizerName && (
          <p className="flex items-center gap-1.5 text-sm text-[color:var(--muted)]">
            <UserIcon className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--accent-deep)]" />
            Organized by {organizerName}
          </p>
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
          {!dateLabel && !timingText && (
            <span className="text-sm font-normal text-[color:var(--muted)]">No date set — shown for the whole festival</span>
          )}
        </div>
      </div>
    </div>
  );
}
