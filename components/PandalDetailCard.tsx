"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  CloseIcon,
  DirectionsIcon,
  PhoneIcon,
  PinIcon,
  UserIcon,
  VerifiedIcon,
} from "@/components/icons";
import GlassBlurLayer from "@/components/GlassBlurLayer";
import { fetchJson } from "@/lib/fetchJson";
import type { Pandal, Sponsor } from "@/lib/types";

interface PandalDetailCardProps {
  pandal: Pandal;
  onClose: () => void;
  /** Full-viewport presentation used on mobile, vs. a floating card on desktop. */
  fullScreen?: boolean;
  /** Frosted-glass card that mirrors the live map behind it, used for the
   * floating desktop popup (which sits directly over the map canvas). */
  glass?: boolean;
}

export default function PandalDetailCard({ pandal, onClose, fullScreen = false, glass = false }: PandalDetailCardProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [route, setRoute] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // "card"-placement ads aren't targeted at any one mandapam — they're a
    // shared pool shown generically inside detail cards, so pick one at
    // random each time a card opens rather than showing the same one always.
    fetchJson<{ sponsors: Sponsor[] }>("/api/sponsors?placement=card").then((data) => {
      if (cancelled || !data) return;
      const pool = data.sponsors;
      setSponsors(pool.length > 0 ? [pool[Math.floor(Math.random() * pool.length)]] : []);
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
  const isToday = pandal.event_date === new Date().toISOString().slice(0, 10);

  const shellClassName = fullScreen
    ? "pointer-events-auto flex h-full w-full flex-col bg-[color:var(--cream-50)]"
    : glass
      ? "map-card relative pointer-events-auto flex max-h-[80vh] w-full max-w-sm flex-col"
      : "card-elevated pointer-events-auto flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden";

  return (
    <div className={shellClassName}>
      {glass && <GlassBlurLayer />}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pandal.image_url} alt={pandal.name} className={fullScreen ? "h-64 w-full object-cover" : "h-44 w-full object-cover"} />
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

        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <span className={isToday ? "badge-live" : "badge-live opacity-70"}>{isToday ? "Serving Now" : "Open"}</span>
            <span className="badge-verified">
              <VerifiedIcon className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>

          <h2 className="text-lg font-bold text-[color:var(--foreground)]">{pandal.name}</h2>

          <div className="space-y-2 text-sm text-[color:var(--muted)]">
            <MetaRow icon={<PinIcon className="h-4 w-4" />}>{pandal.address}</MetaRow>
            <MetaRow icon={<CalendarIcon className="h-4 w-4" />}>{dateLabel}</MetaRow>
            <MetaRow icon={<ClockIcon className="h-4 w-4" />}>{pandal.timing_text}</MetaRow>
            <MetaRow icon={<UserIcon className="h-4 w-4" />}>Organized by {pandal.organizer_name}</MetaRow>
          </div>

          {pandal.description && <p className="text-sm text-[color:var(--muted)]">{pandal.description}</p>}

          {route && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-[color:var(--accent-deep)]">
              <DirectionsIcon className="h-4 w-4" />
              {route.distanceKm < 10 ? route.distanceKm.toFixed(1) : Math.round(route.distanceKm)} km ·{" "}
              {Math.round(route.durationMin)} min drive
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <DirectionsIcon className="h-4 w-4" />
              Get Directions
            </a>
            <a href={`tel:${pandal.contact_phone}`} className="btn-secondary">
              <PhoneIcon className="h-4 w-4" />
              Call {pandal.contact_phone}
            </a>
          </div>

          {pandal.banner_paid && pandal.banner_image_urls && pandal.banner_image_urls.length > 0 ? (
            <div className="flex gap-2 border-t border-[rgba(43,22,8,0.1)] pt-3">
              {pandal.banner_image_urls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="h-16 flex-1 rounded-xl object-cover" />
              ))}
            </div>
          ) : (
            sponsors.length > 0 && (
              <div className="space-y-2 border-t border-[rgba(43,22,8,0.1)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Sponsored by</p>
                <div className="flex flex-wrap gap-3">
                  {sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="map-chip">
                      {sponsor.banner_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sponsor.banner_image_url}
                          alt={sponsor.sponsor_name}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      )}
                      <strong>{sponsor.sponsor_name}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )
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
