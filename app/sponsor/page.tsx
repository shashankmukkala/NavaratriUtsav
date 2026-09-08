"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import Brand from "@/components/Brand";
import ImageUploadField from "@/components/ImageUploadField";
import MultiImageUploadField from "@/components/MultiImageUploadField";
import SignInPrompt from "@/components/SignInPrompt";
import { CheckCircleIcon, HeartIcon, LockIcon, MegaphoneIcon, VerifiedIcon } from "@/components/icons";
import { fetchJson, sendJson } from "@/lib/fetchJson";
import type { Pandal, PaymentSettings } from "@/lib/types";

const DRAFT_KEY = "bappaseva_sponsor_draft";

interface SponsorDraft {
  pandalId: string;
  sponsorName: string;
  contactPhone: string;
  linkUrl: string;
  bannerUrls: string[];
  proofUrl: string | null;
}

export default function SponsorPage() {
  return (
    <Suspense fallback={null}>
      <SponsorPageInner />
    </Suspense>
  );
}

// Reads (and clears) the form draft saved right before being sent off to
// Google to sign in. Read once via a lazy useState initializer rather than
// an effect, since it only matters for the very first render.
function readSponsorDraft(): SponsorDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(DRAFT_KEY);
    return JSON.parse(raw) as SponsorDraft;
  } catch {
    return null;
  }
}

function SponsorPageInner() {
  // ?target=pandal → a banner on one specific pandal's own card (cheaper,
  // less reach). Anything else → the map-wide sponsored slots. useSearchParams
  // (not a raw window.location check) resolves correctly during SSR, so the
  // server and client render the same branch on the very first paint.
  const searchParams = useSearchParams();
  const isPandalTarget = searchParams.get("target") === "pandal";
  const price = isPandalTarget ? 200 : 500;

  const [draft] = useState(readSponsorDraft);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [pandalId, setPandalId] = useState(draft?.pandalId ?? "");
  const [sponsorName, setSponsorName] = useState(draft?.sponsorName ?? "");
  const [contactPhone, setContactPhone] = useState(draft?.contactPhone ?? "");
  const [linkUrl, setLinkUrl] = useState(draft?.linkUrl ?? "");
  const [bannerUrls, setBannerUrls] = useState<string[]>(draft?.bannerUrls ?? []);
  const [proofUrl, setProofUrl] = useState<string | null>(draft?.proofUrl ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<{ user?: { name?: string } } | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    if (!isPandalTarget) return;
    fetchJson<{ pandals: Pandal[] }>("/api/pandals").then((data) => setPandals(data?.pandals ?? []));
  }, [isPandalTarget]);

  useEffect(() => {
    fetchJson<{ settings: PaymentSettings }>("/api/settings").then((data) => setSettings(data?.settings ?? null));
  }, []);

  useEffect(() => {
    fetchJson<{ user?: { name?: string } }>("/api/auth/session").then((data) => setSession(data ?? null));
  }, []);

  // Link is optional — the QR/UPI stays blurred until the required details
  // are filled, so it isn't just sitting exposed for anyone to screenshot
  // without actually being a real advertiser.
  const detailsFilled =
    sponsorName.trim() !== "" && contactPhone.trim() !== "" && bannerUrls.length > 0 && (!isPandalTarget || !!pandalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isPandalTarget && !pandalId) {
      setError("Please choose which mandapam this ad is for.");
      return;
    }
    if (bannerUrls.length === 0) {
      setError("Please upload at least one ad banner image.");
      return;
    }
    if (!proofUrl) {
      setError("Please upload your payment screenshot.");
      return;
    }

    if (!session?.user) {
      const draft: SponsorDraft = { pandalId, sponsorName, contactPhone, linkUrl, bannerUrls, proofUrl };
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Storage unavailable — sign-in still works, form just won't survive the redirect.
      }
      setShowSignIn(true);
      return;
    }

    setSubmitting(true);
    const result = await sendJson("/api/sponsors", {
      pandal_id: isPandalTarget ? pandalId : null,
      sponsor_name: sponsorName,
      contact_phone: contactPhone,
      link_url: linkUrl || null,
      banner_image_urls: bannerUrls,
      payment_proof_url: proofUrl,
    });
    setSubmitting(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error);
    }
  };

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
          <BackButton />
          <Brand />
        </nav>

        <SignInPrompt
          open={showSignIn}
          onClose={() => setShowSignIn(false)}
          callbackUrl={isPandalTarget ? "/sponsor?target=pandal" : "/sponsor"}
          message="We use your Google account just to know who this ad belongs to — no accounts of our own to manage."
        />

        {done ? (
          <div className="mx-auto mt-16 flex max-w-lg flex-col items-center gap-4 text-center">
            <div className="card-elevated flex w-full flex-col items-center gap-4 p-10">
              <span className="icon-tile icon-tile-circle h-16 w-16">
                <CheckCircleIcon className="h-8 w-8" />
              </span>
              <h1 className="text-xl font-bold text-[color:var(--foreground)]">Ad submitted!</h1>
              <p className="text-sm text-[color:var(--muted)]">
                We&apos;ll verify your payment and your ad will go live for 2 days shortly after.
              </p>
              <BackButton className="btn-primary self-start" />
            </div>
          </div>
        ) : (
          <div className="grid gap-10 pt-8 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-16 lg:pt-16">
            <div className="lg:sticky lg:top-8">
              <p className="eyebrow">{isPandalTarget ? "Advertise on a Mandapam Card" : "Advertise on the Map"}</p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-4xl">
                {isPandalTarget ? "Put your ad on one mandapam's card." : "Put your ad in front of everyone."}
              </h1>
              <p className="mt-5 max-w-md text-base text-[color:var(--muted)] sm:text-lg">
                {isPandalTarget
                  ? "Your ad banner shows on the specific mandapam's own card — seen by people who open it."
                  : "Your ad banner is displayed directly on the map screen — seen by everyone browsing for an Annadhanam nearby."}
              </p>

              <div className="mt-8 space-y-4">
                <InfoRow icon={<MegaphoneIcon className="h-5 w-5" />} title={isPandalTarget ? "Shown on one card" : "Shown on the map"}>
                  {isPandalTarget
                    ? "Your banner appears when someone opens that mandapam's card."
                    : "Your banner appears in the sponsored slots everyone sees while browsing."}
                </InfoRow>
                <InfoRow icon={<VerifiedIcon className="h-5 w-5" />} title="Reviewed, not automatic">
                  An admin verifies your payment before your ad goes live.
                </InfoRow>
                <InfoRow icon={<HeartIcon className="h-5 w-5" />} title="Supports the community">
                  Every ad helps keep annadhanams easy to find for everyone.
                </InfoRow>
              </div>

              <div
                className="mt-8 rounded-2xl p-4 text-sm text-[color:var(--foreground)]"
                style={{
                  background: "linear-gradient(160deg, rgba(234,108,29,0.14), rgba(234,108,29,0.04))",
                  boxShadow: "inset 0 0 0 1px rgba(234,108,29,0.2)",
                }}
              >
                <p className="font-semibold text-[color:var(--accent-deep)]">₹{price}, valid for 2 days from approval</p>
                <p className="mt-1">Scan the QR or pay via UPI in the form, then upload a screenshot of the payment.</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">
                  If your ad isn&apos;t verified, you&apos;ll be refunded within 2 hours.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="card-elevated space-y-5 p-5 sm:p-7">
              {isPandalTarget && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
                    Which mandapam? <span className="text-[color:var(--accent-deep)]">*</span>
                  </label>
                  <select required value={pandalId} onChange={(e) => setPandalId(e.target.value)} className="field-input">
                    <option value="">Select a mandapam…</option>
                    {pandals.map((pandal) => (
                      <option key={pandal.id} value={pandal.id}>
                        {pandal.name} — {pandal.address}
                      </option>
                    ))}
                  </select>
                  {pandals.length === 0 && (
                    <p className="mt-1 text-xs text-[color:var(--muted-soft)]">
                      No approved mandapams yet. Ask the organizer to submit theirs first.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
                  Business / brand name <span className="text-[color:var(--accent-deep)]">*</span>
                </label>
                <input
                  required
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Your name, shop, or association"
                  className="field-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
                  Contact phone <span className="text-[color:var(--accent-deep)]">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="field-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
                  Website or social link (optional)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                  className="field-input"
                />
                <p className="mt-1 text-xs text-[color:var(--muted-soft)]">
                  Clicking your ad on the map will take people here.
                </p>
              </div>

              <MultiImageUploadField
                label="Ad banner image(s)"
                folder="sponsors"
                required
                max={3}
                hint={
                  isPandalTarget
                    ? "Square (1:1) works best. Upload up to 3 and they'll rotate like a slideshow."
                    : "Square (1:1) works best — that's the shape of the ad slot on the map. Upload up to 3 and they'll rotate like a slideshow."
                }
                value={bannerUrls}
                onChange={setBannerUrls}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
                  Pay any way <span className="text-[color:var(--accent-deep)]">*</span>
                </label>
                <div className="flex gap-3">
                  <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.18)] bg-white/50">
                    {settings?.qr_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={settings.qr_image_url}
                        alt="Payment QR code"
                        className="h-full w-full object-cover transition-[filter] duration-300"
                        style={{ filter: detailsFilled ? "none" : "blur(6px)" }}
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-center text-xs text-[color:var(--muted-soft)] transition-[filter] duration-300"
                        style={{ filter: detailsFilled ? "none" : "blur(6px)" }}
                      >
                        QR code
                      </div>
                    )}
                    {!detailsFilled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--cream-50)]">
                        <LockIcon className="h-6 w-6 text-[color:var(--muted)]" />
                      </div>
                    )}
                  </div>
                  <div className="relative flex h-28 flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.18)] bg-white/50 px-3">
                    <p
                      className="text-center text-sm font-mono font-semibold text-[color:var(--foreground)] transition-[filter] duration-300"
                      style={{ filter: detailsFilled ? "none" : "blur(6px)" }}
                    >
                      {settings?.upi_id ?? "annadhanam@upi"}
                    </p>
                    {!detailsFilled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--cream-50)]">
                        <LockIcon className="h-6 w-6 text-[color:var(--muted)]" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-[color:var(--muted-soft)]">
                  {detailsFilled
                    ? "Scan the QR or pay to the UPI ID with any app."
                    : `Fill in the details above${isPandalTarget ? " (including the mandapam)" : ""} to reveal this.`}
                </p>
              </div>

              <ImageUploadField label="Payment screenshot" folder="payment-proofs" required value={proofUrl} onChange={setProofUrl} />

              {error && <p className="text-sm text-[color:var(--coral-deep)]">{error}</p>}

              <button type="submit" disabled={submitting} className="btn-commercial w-full py-3">
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(234,108,29,0.12)] text-[color:var(--accent-deep)]">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
        <p className="text-sm text-[color:var(--muted)]">{children}</p>
      </div>
    </div>
  );
}
