"use client";

import { useEffect, useState } from "react";
import AdBannerSlideshow from "@/components/AdBannerSlideshow";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CloseIcon,
  DirectionsIcon,
  PhoneIcon,
  PinIcon,
  UserIcon,
  VerifiedIcon,
} from "@/components/icons";
import { getEventStatus, eventStatusLabel } from "@/lib/eventStatus";
import { fetchJson } from "@/lib/fetchJson";
import type { Pandal, Sponsor } from "@/lib/types";

interface PandalDetailCardProps {
  pandal: Pandal;
  onClose: () => void;
  /** Full-viewport presentation used on mobile, vs. a floating card on desktop. */
  fullScreen?: boolean;
}

export default function PandalDetailCard({ pandal, onClose, fullScreen = false }: PandalDetailCardProps) {
  const [cardAdImages, setCardAdImages] = useState<string[]>([]);
  const [route, setRoute] = useState<{ distanceKm: number; durationMin: number } | null>(null);

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      fetchJson<{ distanceKm: number; durationMin: number }>(
        `/api/directions?from_lat=${latitude}&from_lng=${longitude}&to_lat=${pandal.lat}&to_lng=${pandal.lng}`
      ).then((data) => {
        if (!cancelled && data) setRoute(data);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pandal.id, pandal.lat, pandal.lng]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pandal.lat},${pandal.lng}`;
  const eventDate = new Date(pandal.event_date + "T00:00:00");
  const dateLabel = Number.isNaN(eventDate.getTime())
    ? pandal.event_date
    : eventDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const eventStatus = getEventStatus(pandal.event_date);

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
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pandal.image_url} alt={pandal.name} className={fullScreen ? "h-64 w-full object-cover" : "h-40 w-full object-cover"} />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
          <button
            onClick={onClose}
            aria-label={fullScreen ? "Back" : "Close"}
            className={`absolute top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[color:var(--foreground)] shadow-sm transition-colors hover:bg-white ${
              fullScreen ? "left-3" : "right-3"
            }`}
          >
            {fullScreen ? <ArrowLeftIcon className="h-4 w-4" /> : <CloseIcon className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col space-y-2.5 p-4">
          <div className="flex items-center gap-2">
            <span className={eventStatus === "today" ? "badge-live" : "badge-live opacity-70"}>{eventStatusLabel(eventStatus)}</span>
            <span className="badge-verified">
              <VerifiedIcon className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>

          <h2 className="text-lg font-bold text-[color:var(--foreground)]">{pandal.name}</h2>

          <div className="space-y-1.5 text-sm text-[color:var(--muted)]">
            <MetaRow icon={<PinIcon className="h-4 w-4" />}>
              <span className="line-clamp-2">{pandal.address}</span>
            </MetaRow>
            <MetaRow icon={<CalendarIcon className="h-4 w-4" />}>
              {dateLabel} · {pandal.timing_text}
            </MetaRow>
            <MetaRow icon={<UserIcon className="h-4 w-4" />}>Organized by {pandal.organizer_name}</MetaRow>
          </div>

          {pandal.description && <p className="line-clamp-2 text-sm text-[color:var(--muted)]">{pandal.description}</p>}

          {/* Get Directions / Call are mobile-only here — the desktop card
              trades them for more room for the ad banner below, sharing its
              exact height with the ad panel beside it. */}
          {fullScreen && (
            <>
              {route && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-[color:var(--accent-deep)]">
                  <DirectionsIcon className="h-4 w-4" />
                  {route.distanceKm < 10 ? route.distanceKm.toFixed(1) : Math.round(route.distanceKm)} km ·{" "}
                  {Math.round(route.durationMin)} min drive
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary min-w-0 flex-1 px-2! py-2! text-sm!"
                >
                  <DirectionsIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Get Directions</span>
                </a>
                <a href={`tel:${pandal.contact_phone}`} className="btn-secondary min-w-0 flex-1 px-2! py-2! text-sm!">
                  <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Call {pandal.contact_phone}</span>
                </a>
              </div>
            </>
          )}

          {bannerImages.length > 0 && (
            <div className={`flex min-h-0 flex-col border-t border-[rgba(43,22,8,0.1)] pt-2.5 ${fullScreen ? "" : "flex-1"}`}>
              <div className={`overflow-hidden rounded-lg ${fullScreen ? "h-24" : "min-h-24 flex-1"}`}>
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
