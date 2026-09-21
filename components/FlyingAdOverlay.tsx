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
      // Flight animation itself is ~14s (see globals.css) — clear the node
      // afterward so a lone flight doesn't just sit parked off-screen.
      setTimeout(() => setFlight(null), 14500);
    };
    // First pass shortly after load, then on the configured interval.
    const firstTimer = setTimeout(flyOnce, 4000);
    const interval = setInterval(flyOnce, Math.max(intervalSeconds, 10) * 1000);
    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, [sponsors, intervalSeconds]);

  if (!flight) return null;

  const images = flight.sponsor.banner_image_urls?.length
    ? flight.sponsor.banner_image_urls
    : flight.sponsor.banner_image_url
      ? [flight.sponsor.banner_image_url]
      : [];
  if (images.length === 0) return null;

  const Vehicle = flight.sponsor.vehicle === "rocket" ? RocketIcon : CrowIcon;

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      <div
        key={flight.key}
        className={`absolute top-[12%] ${flight.reverse ? "flying-ad-rtl" : "flying-ad-ltr"}`}
      >
        <div className={`flex items-center gap-1.5 ${flight.reverse ? "-scale-x-100" : ""}`}>
          <Vehicle className="h-9 w-9 flex-shrink-0 drop-shadow-md" />
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

function CrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 70" className={className} aria-hidden="true">
      <path d="M6,44 L26,35 L26,46 Z" fill="#1c1c1c" />
      <ellipse cx="48" cy="35" rx="24" ry="11" fill="#1c1c1c" />
      <circle cx="72" cy="28" r="10" fill="#1c1c1c" />
      <path d="M80,27 L94,23 L81,32 Z" fill="#3a3a3a" />
      <circle cx="75" cy="25" r="1.6" fill="#fff" />
      <path
        d="M42,33 Q18,6 3,16 Q24,28 42,38 Z"
        fill="#0d0d0d"
        style={{ transformOrigin: "42px 33px" }}
        className="crow-wing"
      />
    </svg>
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
