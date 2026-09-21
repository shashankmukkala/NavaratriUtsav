"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AddStarModal from "@/components/AddStarModal";
import AdBannerSlideshow from "@/components/AdBannerSlideshow";
import { BowlIcon, CloseIcon, CopyIcon, DirectionsIcon, MegaphoneIcon, PinIcon, ShareIcon, UserIcon, VerifiedIcon } from "@/components/icons";
import { getEventStatus, eventStatusLabel, formatEventDateRange } from "@/lib/eventStatus";
import { fetchJson } from "@/lib/fetchJson";
import type { Pandal, Sponsor } from "@/lib/types";

interface PandalDetailCardProps {
  pandal: Pandal;
  onClose: () => void;
  /** Bottom-sheet presentation used on mobile, vs. a floating card on desktop. */
  fullScreen?: boolean;
}

export default function PandalDetailCard({ pandal, onClose, fullScreen = false }: PandalDetailCardProps) {
  const [cardAdImages, setCardAdImages] = useState<string[]>([]);
  const [addressCopied, setAddressCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // Sponsorship is money changing hands for a specific mandapam — the
  // "add a banner" prompt below must only ever be a real, actionable offer
  // to the person who actually owns this listing, never a generic link
  // that happens to be sitting on someone else's card.
  const [viewerId, setViewerId] = useState<string | null>(null);
  const isOwner = !!viewerId && viewerId === pandal.user_id;
  const [showStarModal, setShowStarModal] = useState(false);
  const starPending = !pandal.featured && !!pandal.star_payment_proof_url;

  useEffect(() => {
    fetchJson<{ user?: { id?: string } }>("/api/auth/session").then((data) => setViewerId(data?.user?.id ?? null));
  }, []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(pandal.address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked (permissions, non-secure context) —
      // failing silently is fine, the address text is still right there to
      // select and copy by hand.
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/map?pandal=${pandal.id}`;
    // Native share sheet (WhatsApp, Instagram, Messages, etc.) wherever it's
    // available; a plain clipboard copy elsewhere (most desktop browsers).
    if (navigator.share) {
      try {
        await navigator.share({ title: pandal.name, text: `${pandal.name} on BappaSeva`, url });
      } catch {
        // User cancelled the share sheet, or the OS rejected it — nothing to
        // recover from, and definitely not an error worth surfacing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      // Same as copyAddress — clipboard access can be blocked; failing
      // silently is fine since the button itself already shows the intent.
    }
  };

  useEffect(() => {
    let cancelled = false;
    // "card"-placement ads aren't targeted at any one mandapam — they're a
    // shared pool shown generically inside detail cards. With few
    // mandapams having a free (unbannered) slot and potentially many more
    // sponsors than that, cycling every sponsor through every slot meant
    // sponsors later in rotation order could go largely unseen — most
    // people don't keep a card open long enough to reach ad #8 of 10. So
    // instead, each card independently picks just ONE random sponsor (an
    // independent dice roll every time a card opens, not a shared
    // sequence), and shows that sponsor's own images (which can still be
    // a little slideshow if they uploaded more than one) — exposure
    // evens out across sponsors in aggregate over many people opening
    // many cards, rather than depending on how long any one viewer stays.
    fetchJson<{ sponsors: Sponsor[] }>("/api/sponsors?placement=card").then((data) => {
      if (cancelled || !data || data.sponsors.length === 0) return;
      const pick = data.sponsors[Math.floor(Math.random() * data.sponsors.length)];
      const images = pick.banner_image_urls?.length ? pick.banner_image_urls : pick.banner_image_url ? [pick.banner_image_url] : [];
      setCardAdImages(images);
    });
    return () => {
      cancelled = true;
    };
  }, [pandal.id]);

  const eventStatus = getEventStatus(pandal.event_date, pandal.event_date_end);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pandal.lat},${pandal.lng}`;
  const galleryImages = [pandal.image_url, ...(pandal.extra_image_urls ?? [])];

  // A pandal's own paid banner takes priority; otherwise rotate through the
  // generic sponsor pool. Either way it's shown as a plain rectangle, no
  // name/label, to keep this compact and consistent.
  const ownBanner = pandal.banner_paid && pandal.banner_image_urls && pandal.banner_image_urls.length > 0 ? pandal.banner_image_urls : null;
  const bannerImages = ownBanner ?? cardAdImages;

  // Mobile: a fixed height matching the popup wrapper (app/map/page.tsx)
  // exactly — the whole card never scrolls. Only the text block below
  // (essential info + description) scrolls internally; everything else
  // is pinned. Desktop: sized to its actual content, capped at the ad
  // panel's height.
  const shellClassName = fullScreen
    ? "pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-[color:var(--cream-50)]"
    : "card-elevated pointer-events-auto flex max-h-full w-full max-w-sm flex-col overflow-hidden";

  const header = (
    // aspect-video matches the 16:9 crop every photo is uploaded at through
    // the app's own crop tool — but bulk-imported photos (e.g. the CSV
    // import) never went through that crop, so object-cover here fills the
    // frame and crops the excess instead of letterboxing, matching what
    // the crop-tool preview would have produced.
    <div className="relative aspect-video w-full min-h-0 flex-shrink-0 overflow-hidden bg-[rgba(43,22,8,0.06)]">
      {galleryImages.length > 1 ? (
        <AdBannerSlideshow images={galleryImages} alt={pandal.name} fit="cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pandal.image_url} alt={pandal.name} className="h-full w-full object-cover" />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
      {galleryImages.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
          {galleryImages.map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/70 shadow-sm" />
          ))}
        </div>
      )}
      {pandal.featured && pandal.milestone_text && (
        <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 overflow-hidden">
          <div className="absolute -left-9 top-[18px] w-[150px] rotate-[-45deg] bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 py-1 text-center text-[11px] font-bold text-amber-950 shadow-md">
            ★ {pandal.milestone_text}
          </div>
        </div>
      )}
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <button
          onClick={share}
          aria-label="Share"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[color:var(--foreground)] shadow-sm transition-colors hover:bg-white"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[color:var(--foreground)] shadow-sm transition-colors hover:bg-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      {linkCopied && (
        <span className="absolute right-3 top-14 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">Link copied</span>
      )}
    </div>
  );

  // Location/annadhanam info/organizer — always fully visible, never
  // part of anything that scrolls.
  const essentialInfo = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold text-[color:var(--foreground)]">{pandal.name}</h2>
        <span className="badge-verified">
          <VerifiedIcon className="h-3.5 w-3.5" />
          Verified
        </span>
        {/* Only the owner sees this, and only while there's something to
            do — already featured (map pin's glow already shows it) or
            already submitted a proof waiting on admin review both need
            no action, so the prompt only appears for the plain, unpaid
            state. */}
        {isOwner && !pandal.featured && !starPending && (
          <button
            type="button"
            onClick={() => setShowStarModal(true)}
            className="badge-milestone"
          >
            ★ Get a star
          </button>
        )}
        {isOwner && starPending && <span className="badge-milestone opacity-70">★ Star pending review</span>}
      </div>

      <div className="space-y-1.5 text-[13px] text-[color:var(--muted)]">
        <MetaRow icon={<PinIcon className="h-4 w-4" />}>
          <span className="flex items-start gap-1.5">
            <span className="line-clamp-2">{pandal.address}</span>
            <button
              type="button"
              onClick={copyAddress}
              aria-label="Copy address"
              className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--muted-soft)] transition-colors hover:bg-[rgba(43,22,8,0.08)] hover:text-[color:var(--accent-deep)]"
            >
              <CopyIcon className="h-3.5 w-3.5" />
            </button>
            {addressCopied && <span className="mt-0.5 text-xs font-medium text-green-700">Copied</span>}
          </span>
        </MetaRow>
        <MetaRow icon={<BowlIcon className="h-4 w-4" />}>
          {pandal.event_date && pandal.timing_text ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span>
                {formatEventDateRange(pandal.event_date, pandal.event_date_end)} · {pandal.timing_text}
              </span>
              {eventStatus && (
                <span className={`flex-shrink-0 ${eventStatus === "today" ? "badge-live" : "badge-live opacity-70"}`}>
                  {eventStatusLabel(eventStatus)}
                </span>
              )}
            </span>
          ) : (
            "No annadhanam info available"
          )}
        </MetaRow>
        <MetaRow icon={<UserIcon className="h-4 w-4" />}>Organized by {pandal.organizer_name}</MetaRow>
      </div>
    </>
  );

  const descriptionBlock = pandal.description && (
    <p className="mt-2.5 border-t border-[rgba(43,22,8,0.08)] pt-2.5 text-[13px] text-[color:var(--muted)]">
      {pandal.description}
    </p>
  );

  const footerBlock = (
    <>
      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center py-2.5">
        <DirectionsIcon className="h-4 w-4" />
        Get Directions
      </a>

      {/* Always reserves this space (rather than collapsing to nothing
          when there's no ad to show) so the card doesn't look broken —
          paying for a banner slot should mean it's always visibly there,
          whether filled or waiting for one. A plain fixed height, not an
          aspect ratio — simplest way to guarantee it always fits
          completely, at the cost of sometimes cropping into an upload
          that isn't exactly this shape. */}
      <div className="flex flex-col border-t border-[rgba(43,22,8,0.1)] pt-2.5">
        {bannerImages.length > 0 ? (
          <div className={`overflow-hidden rounded-lg ${fullScreen ? "h-40" : "h-28"}`}>
            <AdBannerSlideshow images={bannerImages} alt="" fit="contain" />
          </div>
        ) : isOwner ? (
          // Only the person who actually submitted this mandapam ever sees
          // this as a clickable offer — deep-links straight to this
          // listing's own banner flow, which is itself still gated by an
          // ownership check server-side.
          <Link
            href={`/profile?addBanner=${pandal.id}`}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[rgba(234,108,29,0.35)] text-center transition-colors hover:border-[rgba(234,108,29,0.6)] hover:bg-[rgba(234,108,29,0.05)] ${fullScreen ? "h-40" : "h-28"}`}
          >
            <MegaphoneIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
            <span className="text-xs font-semibold text-[color:var(--accent-deep)]">Add your association banner</span>
          </Link>
        ) : (
          // Anyone else just sees an inert placeholder — no link, and
          // wording that makes clear this isn't an offer to sponsor
          // someone else's mandapam.
          <div className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[rgba(43,22,8,0.15)] px-3 text-center ${fullScreen ? "h-40" : "h-28"}`}>
            <MegaphoneIcon className="h-4 w-4 text-[color:var(--muted-soft)]" />
            <span className="text-xs font-semibold text-[color:var(--muted)]">No sponsor banner yet</span>
            <span className="text-[0.6875rem] text-[color:var(--muted-soft)]">Only this mandapam&apos;s organizer can add one</span>
          </div>
        )}
      </div>
    </>
  );

  // The card itself never scrolls — header and footer (Get
  // Directions/banner) are fixed and pinned. Essential info and the
  // description share one small, fixed-height text block that scrolls
  // on its own: only essential info shows by default, and the
  // description sits below the fold, revealed by scrolling that block
  // specifically. Keeping this block small (instead of reserving
  // whatever space the description needs) is what leaves the extra room
  // for Get Directions to sit higher and the banner to be fully visible
  // with a clean margin below it.
  return (
    <div className={shellClassName}>
      {header}
      <div className="relative flex-shrink-0">
        <div className="max-h-40 overflow-y-auto p-4">
          {essentialInfo}
          {descriptionBlock}
        </div>
        {descriptionBlock && (
          // The global scrollbar-hiding rule means an overflowing box
          // here otherwise looks like the text just ends instead of
          // being scrollable — this fade hints that there's more below.
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[color:var(--cream-50)] to-transparent" />
        )}
      </div>
      <div className={`flex-shrink-0 space-y-2.5 p-4 pt-2.5 ${fullScreen ? "pb-3" : "pb-4"}`}>{footerBlock}</div>

      {showStarModal && <AddStarModal pandal={pandal} onClose={() => setShowStarModal(false)} onSaved={() => setShowStarModal(false)} />}
    </div>
  );
}

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[color:var(--accent-deep)]">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
