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

  // Desktop: this element's own ancestor chain is all real `height`
  // properties (not just max-height) up to the root, so max-h-full here
  // resolves to a genuine pixel value and this can safely be its own
  // scroll container. Mobile: the popup wrapper in app/map/page.tsx
  // already owns the max-height cap AND the scrolling (a percentage
  // max-height nested another level inside a max-height-only ancestor
  // doesn't resolve to anything — see that file for why), so this is
  // just a plain block here, not a second, non-functional scroll box.
  const shellClassName = fullScreen
    ? "pointer-events-auto w-full bg-[color:var(--cream-50)]"
    : "card-elevated pointer-events-auto max-h-full w-full max-w-sm overflow-y-auto overflow-x-hidden";

  const header = (
    // aspect-video matches the 16:9 crop every photo is uploaded at, so the
    // frame fits the photo exactly — anything that caps or stretches this
    // box away from that exact ratio (a fixed height, a max-height for
    // short screens) is what reintroduces empty bars around the photo.
    // Short-screen breathing room comes from the banner/footer sizing
    // below instead, never from squeezing this box.
    <div className="relative aspect-video w-full flex-shrink-0 bg-[rgba(43,22,8,0.06)]">
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

  // Location/annadhanam info/organizer — always fully visible, never
  // part of anything that scrolls.
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
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn-primary w-full justify-center ${fullScreen ? "py-2" : "py-2.5"}`}
      >
        <DirectionsIcon className="h-4 w-4" />
        Get Directions
      </a>

      {/* Always reserves this space (rather than collapsing to nothing
          when there's no ad to show) so the card doesn't look broken —
          paying for a banner slot should mean it's always visibly there,
          whether filled or waiting for one. */}
      {/* aspect-video (not a fixed height), scaled to 3/4 width, so this
          matches the 16:9 ratio a mandapam's own banner is uploaded at —
          same shape on mobile and desktop, no cropping (object-contain
          above handles the generic 1:1 sponsor ads that also rotate
          through here), and reads smaller than the header photo. Sits in
          the scrollable region below essential info, so it's never
          clipped even if it doesn't fit above the fold. The placeholder
          states below match it, so the slot doesn't change size once a
          banner is actually added. */}
      <div className="flex flex-col border-t border-[rgba(43,22,8,0.1)] pt-2.5">
        {bannerImages.length > 0 ? (
          <div className={`mx-auto w-3/4 aspect-video overflow-hidden rounded-lg`}>
            <AdBannerSlideshow images={bannerImages} alt="" />
          </div>
        ) : isOwner ? (
          // Only the person who actually submitted this mandapam ever sees
          // this as a clickable offer — deep-links straight to this
          // listing's own banner flow, which is itself still gated by an
          // ownership check server-side.
          <Link
            href={`/profile?addBanner=${pandal.id}`}
            className={`mx-auto flex w-3/4 aspect-video flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[rgba(234,108,29,0.35)] text-center transition-colors hover:border-[rgba(234,108,29,0.6)] hover:bg-[rgba(234,108,29,0.05)]`}
          >
            <MegaphoneIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
            <span className="text-xs font-semibold text-[color:var(--accent-deep)]">Add your association banner</span>
          </Link>
        ) : (
          // Anyone else just sees an inert placeholder — no link, and
          // wording that makes clear this isn't an offer to sponsor
          // someone else's mandapam.
          <div className={`mx-auto flex w-3/4 aspect-video flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[rgba(43,22,8,0.15)] px-3 text-center`}>
            <MegaphoneIcon className="h-4 w-4 text-[color:var(--muted-soft)]" />
            <span className="text-xs font-semibold text-[color:var(--muted)]">No sponsor banner yet</span>
            <span className="text-[0.6875rem] text-[color:var(--muted-soft)]">Only this mandapam&apos;s organizer can add one</span>
          </div>
        )}
      </div>
    </>
  );

  // Header and essential info (location/annadhanam info/organizer) are
  // pinned, natural-height, and always fully visible without scrolling —
  // that part is non-negotiable and isn't sized against a guessed
  // percentage of the screen, so it can't be squeezed by one.
  //
  // The header + essential info stick to the top of this scroll
  // container (position: sticky, not flex-shrink-0 in a separate scroll
  // region) — they scroll away with everything else when the card's
  // short content doesn't need to scroll at all, and stay pinned in
  // place the moment it does. This needs no knowledge of how tall
  // anything actually is: if the card's natural content fits under the
  // max-height cap, nothing scrolls and this looks identical to a plain
  // static card; if it doesn't fit, this box scrolls and the sticky
  // header/info stay put while Get Directions/the banner/the
  // description scroll underneath — always reachable, never clipped.
  return (
    <div className={shellClassName}>
      <div className="sticky top-0 z-10 bg-[color:var(--cream-50)]">
        {header}
        <div className="space-y-2.5 p-4">{essentialInfo}</div>
      </div>
      <div className="space-y-2.5 p-4 pt-0">
        {footerBlock}
        {descriptionBlock}
      </div>
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
