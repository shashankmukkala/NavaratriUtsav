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
export default function FlyingAdOverlay({
  intervalSeconds,
  topClassName = "top-[12%]",
}: {
  intervalSeconds: number;
  /** Vertical position of the flight band, as a Tailwind top-* class. The
   * mobile layout's header floats absolutely over the map (not in normal
   * flow), tall enough that the default 12% band sits right behind it —
   * that instance passes a fixed px offset clearing the header instead. */
  topClassName?: string;
}) {
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
      // Flight animation itself is ~38s (see globals.css) — slow enough to
      // actually read the banner, not just notice something flew by.
      // Clears the node afterward so a lone flight doesn't just sit parked
      // off-screen.
      setTimeout(() => setFlight(null), 38500);
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
    // z-[6]: above a featured mandapam's glowing map pin (z-index: 5, see
    // .map-pin-featured in globals.css) — this was passing underneath it.
    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      <div
        key={flight.key}
        className={`absolute ${topClassName} ${flight.reverse ? "flying-ad-rtl" : "flying-ad-ltr"}`}
      >
        {/* The vehicle leads in the direction of travel with the banner
            trailing behind — flex-row-reverse repositions them for
            leftward vs. rightward flight, and only the vehicle icon itself
            (never the banner) gets mirrored to face that direction. Mirroring
            the banner would flip the sponsor's actual uploaded image —
            any text or logo in it would render backwards, which is wrong
            regardless of which way it's flying. */}
        <div className={`flex items-center gap-0 ${flight.reverse ? "flex-row" : "flex-row-reverse"}`}>
          {flight.sponsor.vehicle === "rocket" ? (
            <RocketIcon
              className={`h-6 w-6 flex-shrink-0 drop-shadow-md sm:h-7 sm:w-7 xl:h-9 xl:w-9 ${flight.reverse ? "-scale-x-100" : ""}`}
            />
          ) : (
            // A real animated GIF (its own baked-in flap frames, transparent
            // background) instead of the flat SVG silhouette — much closer
            // to "a real nice crow" than shape-based CSS animation can get.
            // The source frames have a large transparent margin baked
            // around the bird itself, so the box is sized tighter than the
            // frame's own aspect ratio to pull it visually closer to the
            // rope/banner (re-encoding to trim that margin server-side
            // isn't viable — this build's GIF/WebP encoder can't produce
            // multi-frame output from reprocessed frames, confirmed via a
            // minimal isolated test, only single-frame output). Sized down
            // on small screens — the desktop size would dwarf a phone-width
            // map. Unlike the rocket (drawn nose-right on purpose), this
            // artwork faces left by default — checked frame-by-frame — so
            // its flip condition is the opposite of the rocket's.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/crow-flying.gif"
              alt=""
              // Negative margin pulls the visible bird closer to the rope,
              // compensating for the transparent margin baked into the
              // source frames — flex-row-reverse (LTR) swaps which side is
              // physically trailing, so this has to flip with it or it'd
              // push the bird further away instead of closer on that side.
              className={`h-12 w-16 flex-shrink-0 object-contain drop-shadow-md sm:h-14 sm:w-20 xl:h-20 xl:w-28 ${
                flight.reverse ? "-mr-3 sm:-mr-4 xl:-mr-6 " : "-ml-3 sm:-ml-4 xl:-ml-6 "
              }${flight.reverse ? "" : "-scale-x-100"}`}
            />
          )}
          <div className="h-px w-1 flex-shrink-0 bg-[rgba(43,22,8,0.45)] sm:w-1.5 xl:w-2" />
          {flight.sponsor.link_url ? (
            <a
              href={flight.sponsor.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto block h-7 w-20 flex-shrink-0 overflow-hidden rounded-md border border-white/60 shadow-lg sm:h-9 sm:w-24 xl:h-11 xl:w-32"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt={flight.sponsor.sponsor_name} className="h-full w-full object-cover" />
            </a>
          ) : (
            <div className="block h-7 w-20 flex-shrink-0 overflow-hidden rounded-md border border-white/60 shadow-lg sm:h-9 sm:w-24 xl:h-11 xl:w-32">
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
