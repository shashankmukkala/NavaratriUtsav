"use client";

import { useEffect, useState } from "react";
import AdBannerSlideshow from "@/components/AdBannerSlideshow";
import { CalendarIcon, CloseIcon, CopyIcon, DirectionsIcon, PinIcon, ShareIcon, UserIcon, VerifiedIcon } from "@/components/icons";
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

  const dateLabel = pandal.event_date
    ? (() => {
        const d = new Date(pandal.event_date + "T00:00:00");
        return Number.isNaN(d.getTime())
          ? pandal.event_date
          : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
      })()
    : null;
  const eventStatus = getEventStatus(pandal.event_date);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pandal.lat},${pandal.lng}`;

  // A pandal's own paid banner takes priority; otherwise rotate through the
  // generic sponsor pool. Either way it's shown as a plain rectangle, no
  // name/label, to keep this compact and consistent.
  const ownBanner = pandal.banner_paid && pandal.banner_image_urls && pandal.banner_image_urls.length > 0 ? pandal.banner_image_urls : null;
  const bannerImages = ownBanner ?? cardAdImages;

  // Shares the same flex row as the ad panel in app/map/page.tsx (rather
  // than floating as a separate absolutely-positioned overlay), so h-full
  // makes it exactly as tall as that panel by construction.
  const shellClassName = fullScreen
    ? "pointer-events-auto flex h-full w-full flex-col bg-[color:var(--cream-50)]"
    : "card-elevated pointer-events-auto flex h-full w-full max-w-md flex-col overflow-hidden";

  return (
    <div className={shellClassName}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className={`relative flex-shrink-0 bg-[rgba(43,22,8,0.06)] ${fullScreen ? "h-56" : "h-48"}`}>
          {/* object-contain so the whole photo shows — object-cover was
              cropping into it to fill the box instead of just fitting it. */}
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
            <span className="absolute right-3 top-14 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
              Link copied
            </span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col space-y-2.5 p-4">
          <div className="flex items-center gap-2">
            {eventStatus && (
              <span className={eventStatus === "today" ? "badge-live" : "badge-live opacity-70"}>{eventStatusLabel(eventStatus)}</span>
            )}
            <span className="badge-verified">
              <VerifiedIcon className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>

          <h2 className="text-lg font-bold text-[color:var(--foreground)]">{pandal.name}</h2>

          <div className="space-y-1.5 text-sm text-[color:var(--muted)]">
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
            {dateLabel ? (
              <MetaRow icon={<CalendarIcon className="h-4 w-4" />}>
                {dateLabel}
                {pandal.timing_text ? ` · ${pandal.timing_text}` : ""}
              </MetaRow>
            ) : (
              <MetaRow icon={<CalendarIcon className="h-4 w-4" />}>Mandapam only — no annadhanam date shared</MetaRow>
            )}
            <MetaRow icon={<UserIcon className="h-4 w-4" />}>Organized by {pandal.organizer_name}</MetaRow>
          </div>

          {pandal.description && <p className="line-clamp-2 text-sm text-[color:var(--muted)]">{pandal.description}</p>}

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full justify-center py-2.5"
          >
            <DirectionsIcon className="h-4 w-4" />
            Get Directions
          </a>

          {bannerImages.length > 0 && (
            <div className={`flex min-h-0 flex-col border-t border-[rgba(43,22,8,0.1)] pt-2.5 ${fullScreen ? "" : "flex-1"}`}>
              <div className={`overflow-hidden rounded-lg ${fullScreen ? "h-36" : "min-h-24 flex-1"}`}>
                <AdBannerSlideshow images={bannerImages} alt="" />
              </div>
            </div>
          )}
        </div>
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
