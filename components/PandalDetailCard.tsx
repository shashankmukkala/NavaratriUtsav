"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdBannerSlideshow from "@/components/AdBannerSlideshow";
import { BowlIcon, CloseIcon, CopyIcon, DirectionsIcon, MegaphoneIcon, PinIcon, ShareIcon, UserIcon, VerifiedIcon } from "@/components/icons";
import { getEventStatus, eventStatusLabel } from "@/lib/eventStatus";
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
    // shared pool shown generically inside detail cards. Not fixed to any
    // one sponsor or slot: every sponsor with an available banner rotates
    // through this same spot, in a fresh shuffled order each time a card
    // opens, rather than one sponsor always being shown (or always first).
    fetchJson<{ sponsors: Sponsor[] }>("/api/sponsors?placement=card").then((data) => {
      if (cancelled || !data) return;
      const images = data.sponsors
        .map((s) => s.banner_image_urls?.[0] ?? s.banner_image_url)
        .filter((url): url is string => Boolean(url));
      for (let i = images.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [images[i], images[j]] = [images[j], images[i]];
      }
      setCardAdImages(images);
    });
    return () => {
      cancelled = true;
    };
  }, [pandal.id]);

  const eventStatus = getEventStatus(pandal.event_date);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pandal.lat},${pandal.lng}`;

  // A pandal's own paid banner takes priority; otherwise rotate through the
  // generic sponsor pool. Either way it's shown as a plain rectangle, no
  // name/label, to keep this compact and consistent.
  const ownBanner = pandal.banner_paid && pandal.banner_image_urls && pandal.banner_image_urls.length > 0 ? pandal.banner_image_urls : null;
  const bannerImages = ownBanner ?? cardAdImages;

  // Both shrink to fit their actual content, capped at a max height (the
  // ad panel's height on desktop, the popup wrapper's on mobile — see
  // app/map/page.tsx) rather than always stretching to fill it — a fixed
  // height regardless of content left a wall of empty space below the
  // footer whenever a card had a short essential-info block and no
  // description. The image/Get Directions/banner stay pinned in place
  // either way, with only the text block in between scrolling — so a
  // long description still can't push the footer out of reach when the
  // content-driven height does hit the cap.
  const shellClassName = fullScreen
    ? "pointer-events-auto flex max-h-full w-full flex-col bg-[color:var(--cream-50)]"
    : "card-elevated pointer-events-auto flex max-h-full w-full max-w-sm flex-col overflow-hidden";

  const header = (
    // aspect-video matches the 16:9 crop every photo is uploaded at, so the
    // frame fits the photo exactly — a mismatched fixed height was what
    // left gray letterboxing bars around it. On mobile only, max-h also
    // caps how much vertical room it can claim on a short screen, so
    // essential info/Get Directions/the banner below always have enough
    // space left to render in full — desktop has no such height pressure
    // (and capping it there just reintroduced the letterboxing instead).
    <div className={`relative aspect-video w-full flex-shrink-0 bg-[rgba(43,22,8,0.06)] ${fullScreen ? "max-h-[26svh]" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pandal.image_url} alt={pandal.name} className="h-full w-full object-contain" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
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

  // Essential info (location/annadhanam info/organizer) and the
  // description share one small scrollable text block below — by
  // default only essential info shows; the description sits below the
  // fold and only appears once that block is scrolled. Keeping this one
  // compact area (instead of reserving separate space for the
  // description) is what leaves the extra room for Get Directions/the
  // banner below.
  const essentialInfo = (
    <>
      {eventStatus && (
        <div>
          <span className={eventStatus === "today" ? "badge-live" : "badge-live opacity-70"}>{eventStatusLabel(eventStatus)}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold text-[color:var(--foreground)]">{pandal.name}</h2>
        <span className="badge-verified">
          <VerifiedIcon className="h-3.5 w-3.5" />
          Verified
        </span>
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
          {pandal.event_date && pandal.timing_text ? pandal.timing_text : "No annadhanam info available"}
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
          whether filled or waiting for one. */}
      <div className="flex flex-col border-t border-[rgba(43,22,8,0.1)] pt-2.5">
        {bannerImages.length > 0 ? (
          <div className="h-32 overflow-hidden rounded-lg">
            <AdBannerSlideshow images={bannerImages} alt="" />
          </div>
        ) : isOwner ? (
          // Only the person who actually submitted this mandapam ever sees
          // this as a clickable offer — deep-links straight to this
          // listing's own banner flow, which is itself still gated by an
          // ownership check server-side.
          <Link
            href={`/profile?addBanner=${pandal.id}`}
            className="flex h-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[rgba(234,108,29,0.35)] text-center transition-colors hover:border-[rgba(234,108,29,0.6)] hover:bg-[rgba(234,108,29,0.05)]"
          >
            <MegaphoneIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
            <span className="text-xs font-semibold text-[color:var(--accent-deep)]">Add your association banner</span>
          </Link>
        ) : (
          // Anyone else just sees an inert placeholder — no link, and
          // wording that makes clear this isn't an offer to sponsor
          // someone else's mandapam.
          <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[rgba(43,22,8,0.15)] px-3 text-center">
            <MegaphoneIcon className="h-4 w-4 text-[color:var(--muted-soft)]" />
            <span className="text-xs font-semibold text-[color:var(--muted)]">No sponsor banner yet</span>
            <span className="text-[0.6875rem] text-[color:var(--muted-soft)]">Only this mandapam&apos;s organizer can add one</span>
          </div>
        )}
      </div>
    </>
  );

  // Header and footer (Get Directions/banner) are fixed-size and always
  // fully visible. Essential info and the description share one compact,
  // FIXED-height scrollable block (flex-shrink-0, not flex-1 — it must
  // not grow to fill leftover space): only essential info is visible by
  // default, and the description sits just below the fold, revealed by
  // scrolling. Keeping this block small (rather than reserving however
  // much space the description happens to need) is what leaves the
  // extra room below for Get Directions to sit higher and the banner to
  // be bigger.
  return (
    <div className={shellClassName}>
      {header}
      <div className="relative flex-shrink-0">
        <div className="max-h-36 overflow-y-auto p-4">
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
      <div className="flex-shrink-0 space-y-2.5 p-4 pt-2.5 pb-5">{footerBlock}</div>
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
