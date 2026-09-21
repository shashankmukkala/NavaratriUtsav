"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { Sponsor } from "@/lib/types";

interface Flight {
  key: number;
  sponsor: Sponsor;
  reverse: boolean;
}

/** The premium "flying ad" placement — a crow or rocket (admin's choice per
 * ad, see AdminEditSponsorModal) tows a sponsor's banner across the map
 * every so often. Purely decorative/pointer-events-none except the banner
 * itself, which is a real link — and it only ever flies over open map
 * area (a band near the top), never through the densest part of a pin
 * cluster where it'd get in the way of actually browsing. */
export default function FlyingAdOverlay({ intervalSeconds }: { intervalSeconds: number }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const nextKey = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ sponsors: Sponsor[] }>("/api/sponsors?placement=crow").then((data) => {
      if (!cancelled && data) setSponsors(data.sponsors);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sponsors.length === 0) return;
    const flyOnce = () => {
      const sponsor = sponsors[Math.floor(Math.random() * sponsors.length)];
      nextKey.current += 1;
      setFlight({ key: nextKey.current, sponsor, reverse: Math.random() < 0.5 });
      // Flight animation itself is ~26s (see globals.css) — slow enough to
      // actually read the banner, not just notice something flew by.
      // Clears the node afterward so a lone flight doesn't just sit parked
      // off-screen.
      setTimeout(() => setFlight(null), 26500);
    };
    // Right away on entering the map, then on the configured interval —
    // no reason to make someone wait to see it the first time.
    flyOnce();
    const interval = setInterval(flyOnce, Math.max(intervalSeconds, 10) * 1000);
    return () => clearInterval(interval);
  }, [sponsors, intervalSeconds]);

  if (!flight) return null;

  const images = flight.sponsor.banner_image_urls?.length
    ? flight.sponsor.banner_image_urls
    : flight.sponsor.banner_image_url
      ? [flight.sponsor.banner_image_url]
      : [];
  if (images.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      <div
        key={flight.key}
        className={`absolute top-[12%] ${flight.reverse ? "flying-ad-rtl" : "flying-ad-ltr"}`}
      >
        {/* The vehicle leads in the direction of travel with the banner
            trailing behind — flex-row-reverse repositions them for
            leftward vs. rightward flight, and only the vehicle icon itself
            (never the banner) gets mirrored to face that direction. Mirroring
            the banner would flip the sponsor's actual uploaded image —
            any text or logo in it would render backwards, which is wrong
            regardless of which way it's flying. */}
        <div className={`flex items-center gap-1.5 ${flight.reverse ? "flex-row" : "flex-row-reverse"}`}>
          {flight.sponsor.vehicle === "rocket" ? (
            <RocketIcon className={`h-9 w-9 flex-shrink-0 drop-shadow-md ${flight.reverse ? "-scale-x-100" : ""}`} />
          ) : (
            // A real animated GIF (its own baked-in flap frames, transparent
            // background) instead of the flat SVG silhouette — much closer
            // to "a real nice crow" than shape-based CSS animation can get.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/crow-flying.gif"
              alt=""
              className={`h-20 w-32 flex-shrink-0 object-contain drop-shadow-md ${flight.reverse ? "-scale-x-100" : ""}`}
            />
          )}
          <div className="h-px w-6 flex-shrink-0 bg-[rgba(43,22,8,0.45)]" />
          {flight.sponsor.link_url ? (
            <a
              href={flight.sponsor.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto block h-11 w-32 flex-shrink-0 overflow-hidden rounded-md border border-white/60 shadow-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt={flight.sponsor.sponsor_name} className="h-full w-full object-cover" />
            </a>
          ) : (
            <div className="block h-11 w-32 flex-shrink-0 overflow-hidden rounded-md border border-white/60 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt={flight.sponsor.sponsor_name} className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 70" className={className} aria-hidden="true">
      <path d="M20,35 C20,18 45,8 65,8 C85,8 95,20 95,35 C85,50 85,50 65,62 C45,54 20,52 20,35 Z" fill="#e2572b" />
      <circle cx="70" cy="32" r="9" fill="#fef3c7" />
      <path d="M20,28 L4,20 L20,35 Z" fill="#a83a1c" />
      <path d="M20,42 L4,50 L20,35 Z" fill="#a83a1c" />
      <path
        d="M10,35 Q0,32 -6,35 Q0,38 10,35 Z"
        fill="#fbbf24"
        className="rocket-flame"
        style={{ transformOrigin: "10px 35px" }}
      />
    </svg>
  );
}
