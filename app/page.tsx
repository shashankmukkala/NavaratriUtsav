"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import MapView from "@/components/MapView";
import ProfileNavLink from "@/components/ProfileNavLink";
import {
  ArrowRightIcon,
  CheckIcon,
  HeartIcon,
  LeafIcon,
  MegaphoneIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/icons";
import { fetchJson } from "@/lib/fetchJson";
import { distanceKm } from "@/lib/geo";
import type { Pandal } from "@/lib/types";

export default function HomePage() {
  const [pandals, setPandals] = useState<Pandal[] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchJson<{ pandals: Pandal[] }>("/api/pandals").then((data) => setPandals(data?.pandals ?? []));
  }, []);

  // Only asked for once the user asks to find the nearest one — not
  // automatically the moment the page loads.
  const requestLocation = () => {
    if (coords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const nearest =
    pandals && pandals.length > 0
      ? [...pandals].sort((a, b) => {
          if (!coords) return 0;
          return distanceKm(coords.lat, coords.lng, a.lat, a.lng) - distanceKm(coords.lat, coords.lng, b.lat, b.lng);
        })[0]
      : null;
  const nearestKm = nearest && coords ? distanceKm(coords.lat, coords.lng, nearest.lat, nearest.lng) : null;

  return (
    <div
      className="w-full"
      style={{
        background:
          "radial-gradient(ellipse 70% 45% at 15% 0%, rgba(244,169,60,0.32), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 8%, rgba(234,108,29,0.22), transparent 55%), linear-gradient(180deg, var(--cream-50), var(--cream-200) 45%, var(--cream-100))",
      }}
    >
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden px-4 pb-4 pt-4 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-left.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-0 w-56 sm:w-72 lg:w-96"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-right.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 z-0 w-56 sm:w-72 lg:w-96"
        />

        <div className="relative z-10 mx-auto max-w-6xl">
          <nav className="nav-shell mt-2 flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
            <Brand tagline />
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/ads" className="btn-secondary hidden! sm:inline-flex! px-3! py-1.5! text-xs!">
                <MegaphoneIcon className="h-3.5 w-3.5" />
                Publish Ads
              </Link>
              <Link href="/map" className="btn-primary px-3! py-1.5! text-xs!">
                <PinIcon className="h-3.5 w-3.5" />
                View Map
              </Link>
              <ProfileNavLink />
            </div>
          </nav>

          <div className="grid gap-10 py-10 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-16">
            <div>
              <h1 className="hero-title mt-3">
                Where <span className="text-[color:var(--accent-deep)]">Bappa</span> brings us together.
              </h1>
              <p className="mt-5 max-w-md text-base text-[color:var(--muted)] sm:text-lg">
                Find Annadhanam being served around you this Ganesh Chaturthi.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/map" className="btn-primary px-5! py-2.5! text-sm!">
                  <PinIcon className="h-4 w-4" />
                  Explore Annadhanam
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/submit" className="btn-secondary px-5! py-2.5! text-sm!">
                  <PlusIcon className="h-4 w-4" />
                  Add your Mandapam Seva
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap gap-x-8 gap-y-4">
                <Stat icon={<UsersIcon className="h-5 w-5" />} label="Meals shared with love" />
                <Stat
                  icon={<PinIcon className="h-5 w-5" />}
                  label={pandals ? `${pandals.length}+ Annadhanams` : "Annadhanams near you"}
                />
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/bappa.png" alt="Ganesha blessing the festival" className="relative z-10 w-full" />
            
             
            </div>
          </div>
        </div>
      </section>

      {/* ===== Annadhanam near you ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6">
        <div className="card-elevated overflow-hidden p-5 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_1.3fr] lg:items-start">
            <div>
              <p className="eyebrow">Find near you</p>
              <h2 className="mt-2 text-2xl font-bold text-[color:var(--foreground)] sm:text-3xl">Annadhanam near you.</h2>
              <p className="mt-3 text-sm text-[color:var(--muted)] sm:text-base">
                Search and discover community annadhanams happening today.
              </p>
              <form
                action="/map"
                className="mt-5 flex items-center gap-2 rounded-full border border-[rgba(43,22,8,0.12)] bg-white/70 px-4 py-2.5 text-sm text-[color:var(--muted)]"
              >
                <SearchIcon className="h-4 w-4 flex-shrink-0" />
                <input
                  name="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your area or city"
                  className="w-full bg-transparent text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-soft)]"
                />
              </form>
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-[color:var(--muted)]">
                <span className="badge-live" />
                {pandals === null
                  ? "Loading annadhanams…"
                  : pandals.length > 0
                    ? "Showing annadhanams serving today"
                    : "No annadhanams published yet — be the first to add one"}
              </p>
            </div>

            <div className="relative h-72 overflow-hidden rounded-[1.5rem] border border-[rgba(43,22,8,0.08)] sm:h-80">
              <MapView pandals={pandals ?? []} selectedId={nearest?.id ?? null} onSelect={() => {}} />

              {nearest && (
                <div className="map-card pointer-events-none absolute bottom-3 right-3 w-64 max-w-[80%] p-3">
                  <div className="flex gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={nearest.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{nearest.name}</p>
                      <p className="truncate text-xs text-[color:var(--muted)]">
                        {nearestKm !== null ? `${nearestKm.toFixed(1)} km away · ` : ""}
                        {nearest.address}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-[color:var(--accent-deep)]">{nearest.timing_text}</p>
                    </div>
                  </div>
                  {!coords && (
                    <button
                      type="button"
                      onClick={requestLocation}
                      className="pointer-events-auto mt-2 flex items-center gap-1 text-xs font-semibold text-[color:var(--accent-deep)] underline"
                    >
                      <PinIcon className="h-3.5 w-3.5" />
                      Use my location to find the nearest
                    </button>
                  )}
                  <Link href="/map" className="btn-primary pointer-events-auto mt-3 w-full py-2 text-sm">
                    View Details
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== A meal in Bappa's name ===== */}
      <section id="meal" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div
            className="overflow-hidden rounded-[2rem]"
            style={{ boxShadow: "0 28px 70px -30px rgba(43,22,8,0.35)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/place.png"
              alt="Volunteers serving food at an Annadhanam Seva stall near a temple"
              className="w-full"
            />
          </div>
          <div>
            <p className="eyebrow">Annadhanam</p>
            <h2 className="mt-2 text-2xl font-bold leading-snug text-[color:var(--foreground)] sm:text-3xl">
              A meal in Bappa&apos;s name. A smile for someone&apos;s day.
            </h2>
            <p className="mt-4 max-w-md text-sm text-[color:var(--muted)] sm:text-base">
              During Ganesh Chaturthi, communities come together to serve food to everyone — with devotion, kindness
              and love.
            </p>
            <div className="mt-6 space-y-3">
              <Checklist icon={<UsersIcon className="h-5 w-5" />}>Open to all</Checklist>
              <Checklist icon={<HeartIcon className="h-5 w-5" />}>Served with devotion</Checklist>
              <Checklist icon={<LeafIcon className="h-5 w-5" />}>Stronger communities</Checklist>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Be a part of it ===== */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-[rgba(234,108,29,0.16)] p-6 sm:p-10"
          style={{ background: "linear-gradient(135deg, #fff6e8, #ffe3c2)" }}
        >
          <div className="grid gap-8 sm:grid-cols-[1.4fr_1.1fr] sm:items-center">
            <div>
              <p className="eyebrow">Be a part of it</p>
              <h2 className="mt-2 text-xl font-bold text-[color:var(--foreground)] sm:text-2xl">
                Know an Annadhanam we&apos;re missing?
              </h2>
              <p className="mt-2 max-w-md text-sm text-[color:var(--muted)]">
                Help someone find a meal, a blessing, and a little more community.
              </p>
              <Link href="/submit" className="btn-primary mt-5">
                <PlusIcon className="h-4 w-4" />
                Add your Mandapam Seva
              </Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/food.png"
              alt="A traditional festival thali served on a banana leaf"
              className="hidden h-full max-h-64 w-full object-cover sm:block"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 85% 78% at center, black 60%, transparent 100%)",
                maskImage: "radial-gradient(ellipse 85% 78% at center, black 60%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[rgba(43,22,8,0.08)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex justify-center sm:justify-start">
            <Brand tagline />
          </div>
          <p className="text-sm text-[color:var(--muted)]">Food unites. Bappa guides.</p>
          <p className="text-sm font-semibold text-[color:var(--accent-deep)]">
            Made with a little extra love for PGs &amp; Hostelers. ❤️
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
      <span className="text-[color:var(--accent)]">{icon}</span>
      {label}
    </div>
  );
}

function Checklist({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(234,108,29,0.12)] text-[color:var(--accent-deep)]">
        {icon}
      </span>
      <span className="text-sm font-semibold text-[color:var(--foreground)]">{children}</span>
      <CheckIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
    </div>
  );
}
