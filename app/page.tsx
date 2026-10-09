"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import MapView from "@/components/MapView";
import {
  ArrowRightIcon,
  BowlIcon,
  CalendarIcon,
  ChevronDownIcon,
  CloseIcon,
  CrosshairIcon,
  DandiyaIcon,
  DiyaIcon,
  HeartIcon,
  InstagramIcon,
  MapIcon,
  MegaphoneIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  SparkleIcon,
  TempleIcon,
  UserIcon,
  UsersIcon,
  VerifiedIcon,
  XLogoIcon,
  
} from "@/components/icons";
import { formatEventDateRange, getEventStatus } from "@/lib/eventStatus";
import { fetchJson } from "@/lib/fetchJson";
import { distanceKm } from "@/lib/geo";
import { CATEGORIES, categoryInfo } from "@/lib/categories";
import { FESTIVAL_LABEL } from "@/lib/siteMeta";
import type { ListingCategory, Pandal } from "@/lib/types";

type CategoryFilter = "all" | ListingCategory;

const FEATURED_SLOT_COUNT = 4;
const SAVED_KEY = "utsav_saved_listings";

// Placeholder profile URLs — swap for the real handles once they exist.
const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/hydnavaratriutsav?obrf=dnFhNHJ5cjU1cTBt&utm_source=qr/",

  x: "https://x.com/shashankmukkal?s=11&t=TJr5VqFUeisSxS3XK61XpA",
};

const NAV_LINKS = [
  { href: "/map", label: "Explore" },
  { href: "/map?category=dandiya", label: "Dandiya" },
  { href: "/map?category=pandal", label: "Pandal Map" },
  { href: "/map?category=cultural", label: "Events" },
];

const FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...CATEGORIES.map((c) => ({ value: c.value, label: c.plural })),
];

function readSaved(): string[] {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const [pandals, setPandals] = useState<Pandal[] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [selectedPandal, setSelectedPandal] = useState<Pandal | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    fetchJson<{ pandals: Pandal[] }>("/api/pandals").then((data) => setPandals(data?.pandals ?? []));
  }, []);

  // Saved hearts live in this browser only — read after mount so the
  // server render and first client render match.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(readSaved());
  }, []);

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        // Storage blocked (private mode etc.) — the heart still toggles for this visit.
      }
      return next;
    });
  };

  // Only asked for once the user taps a locate/distance control — not
  // automatically the moment the page loads.
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const visiblePandals = useMemo(
    () => (pandals ?? []).filter((p) => filter === "all" || categoryInfo(p.category).value === filter),
    [pandals, filter]
  );
  const featured = useMemo(() => (pandals ?? []).filter((p) => p.featured).slice(0, FEATURED_SLOT_COUNT), [pandals]);
  const emptyFeaturedSlots = FEATURED_SLOT_COUNT - featured.length;

  const selectedKm =
    selectedPandal && coords ? distanceKm(coords.lat, coords.lng, selectedPandal.lat, selectedPandal.lng) : null;

  return (
    <div className="w-full bg-[color:var(--cream-50)]">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-[color:var(--utsav-night)] text-[color:var(--utsav-ink-light)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/utsav-hero-night.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
        />
        {/* A light, even navy veil so the centred text reads without hiding
            the artwork — only the bottom deepens to blend into the next section. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(12,24,48,0.5) 0%, rgba(12,24,48,0.45) 45%, rgba(40,10,8,0.6) 85%, rgba(58,14,11,0.85) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-32">
          <nav className="flex items-center justify-between gap-3 py-2">
            <Brand tagline tone="light" />
            <div className="hidden items-center gap-7 text-sm font-medium text-[color:var(--utsav-ink-light)]/90 lg:flex">
              {NAV_LINKS.map((link) => (
                <Link key={link.label} href={link.href} className="transition-colors hover:text-[color:var(--utsav-gold)]">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-3.5 py-2 text-sm backdrop-blur-sm md:inline-flex">
                <PinIcon className="h-4 w-4" />
                Hyderabad
                <ChevronDownIcon className="h-3.5 w-3.5 opacity-70" />
              </span>
              <Link
                href="/ads"
                aria-label="Publish Ads"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/20 px-2.5 py-2 text-xs font-semibold backdrop-blur-sm transition-colors hover:border-[color:var(--utsav-gold)] hover:text-[color:var(--utsav-gold)] sm:px-4 sm:text-sm"
              >
                <MegaphoneIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Publish Ads</span>
              </Link>
              <Link href="/submit" className="btn-gold px-3.5! py-2! text-xs! sm:px-4! sm:text-sm!">
                <PlusIcon className="h-4 w-4" />
                Add Event
              </Link>
              <Link
                href="/profile"
                aria-label="Your profile"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/20 backdrop-blur-sm transition-colors hover:border-[color:var(--utsav-gold)]"
              >
                <UserIcon className="h-4 w-4" />
              </Link>
            </div>
          </nav>

          <div className="relative mx-auto mt-8 max-w-3xl text-center [text-shadow:0_2px_12px_rgba(0,0,0,0.5)] sm:mt-12">
            <div>
              <p className="utsav-eyebrow">Durga Puja · Dandiya · Our People</p>
              <h1 className="utsav-title mt-4 text-[2.6rem] sm:text-6xl lg:text-[4.25rem]">
                Nine Nights.
                <br />
                <span className="text-[color:var(--utsav-gold)]">
                  A Thousand
                  <br />
                  Connections.
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-base font-medium text-[color:var(--utsav-ink-light)] [text-shadow:0_1px_3px_rgba(0,0,0,0.7),0_2px_16px_rgba(0,0,0,0.6)] sm:text-lg">
                Discover Durga Maa pandals, dandiya nights, cultural events and workshops — all on one map.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3 [text-shadow:none]">
                <a href="#featured" className="btn-gold">
                  <TempleIcon className="h-4 w-4" />
                  Explore Celebrations
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
                <Link href="/map" className="btn-ghost-light">
                  <MapIcon className="h-4 w-4" />
                  View Festival Map
                </Link>
              </div>

              <div className="mx-auto mt-9 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 text-left sm:grid-cols-4">
                <HeroStat
                  icon={<TempleIcon className="h-6 w-6" />}
                  top={pandals && pandals.length > 0 ? `${pandals.length}+` : "Every"}
                  bottom="celebrations"
                />
                <HeroStat icon={<PinIcon className="h-6 w-6" />} top="Cities across" bottom="India" />
                <HeroStat icon={<UsersIcon className="h-6 w-6" />} top="Community" bottom="powered" />
                <HeroStat icon={<VerifiedIcon className="h-6 w-6" />} top="Verified" bottom="events" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== What are you looking for? ===== */}
      <section className="relative z-20 -mt-16 bg-[linear-gradient(to_bottom,transparent_4rem,var(--utsav-wine)_4rem)] px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 rounded-[1.75rem] border border-[rgba(184,50,31,0.15)] bg-[color:var(--cream-50)] p-5 shadow-[0_30px_70px_-30px_rgba(12,24,48,0.55)] sm:p-6 md:grid-cols-3 lg:grid-cols-[0.8fr_1fr_1fr_1fr_0.75fr] lg:items-center lg:gap-3">
          <div className="md:col-span-3 lg:col-span-1">
            <h2 className="font-display text-xl font-bold leading-tight text-[color:var(--foreground)] xl:text-2xl">What are you looking for?</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Choose what you want to explore</p>
          </div>

          <ChoiceTile
            icon={<TempleIcon className="h-6 w-6" />}
            title="Puja Darshan"
            text="Explore Durga Maa pandals near you"
            href="/map?category=pandal"
          />
          <ChoiceTile
            icon={<DandiyaIcon className="h-6 w-6" />}
            title="Dandiya Nights"
            text="Garba & dandiya events in your city"
            href="/map?category=dandiya"
          />
          <ChoiceTile
            icon={<SparkleIcon className="h-6 w-6" />}
            title="Events & Workshops"
            text="Cultural shows & garba classes"
            href="/map?category=cultural"
          />

          <div className="space-y-3 border-[rgba(43,22,8,0.08)] md:col-span-3 lg:col-span-1 lg:border-l lg:pl-5">
            <div className="flex items-start gap-3">
              <CalendarIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[color:var(--utsav-crimson)]" />
              <div>
                <p className="text-sm font-semibold text-[color:var(--foreground)]">Navratri</p>
                <p className="text-xs text-[color:var(--muted)]">{FESTIVAL_LABEL}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <PinIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[color:var(--utsav-crimson)]" />
              <div>
                <p className="text-sm font-semibold text-[color:var(--foreground)]">Hyderabad</p>
                <button
                  type="button"
                  onClick={() => {
                    requestLocation();
                    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="text-xs font-medium text-[color:var(--utsav-crimson)] hover:underline"
                >
                  Use my location
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ===== Celebrations in your city ===== */}
      <section id="explore" className="scroll-mt-4 bg-[linear-gradient(180deg,var(--utsav-wine)_0%,var(--utsav-wine-2)_100%)] pt-14 text-[color:var(--utsav-ink-light)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_1.3fr] lg:items-center">
          <div>
            <p className="utsav-eyebrow">Explore near you</p>
            <h2 className="utsav-title mt-3 text-4xl sm:text-5xl">
              Celebrations
              <br />
              <span className="text-[color:var(--utsav-gold)]">in your city.</span>
            </h2>
            <p className="mt-4 max-w-sm text-base text-[color:var(--utsav-ink-light)]/80">
              Pandals, dandiya nights, events and workshops — pick a filter and see them all on one map.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <form
                action="/map"
                className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-3 text-sm text-[color:var(--muted)]"
              >
                <SearchIcon className="h-4 w-4 flex-shrink-0" />
                <input
                  name="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your area, city or pandal…"
                  className="w-full bg-transparent text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-soft)]"
                />
              </form>
              <button
                type="button"
                onClick={requestLocation}
                aria-label="Use my location"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-[color:var(--foreground)] transition-colors hover:text-[color:var(--utsav-crimson)]"
              >
                <CrosshairIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setFilter(f.value);
                    setSelectedPandal(null);
                  }}
                  className={`utsav-chip ${filter === f.value ? "utsav-chip-active" : ""}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <p className="mt-5 flex items-center gap-2 text-xs font-medium text-[color:var(--utsav-ink-light)]/70">
              <span className="badge-live" />
              {pandals === null
                ? "Loading celebrations…"
                : visiblePandals.length > 0
                  ? `${visiblePandals.length} on the map`
                  : "Nothing here yet — be the first to add one"}
            </p>
          </div>

          <div className="relative h-80 overflow-hidden rounded-[1.75rem] border border-[rgba(232,169,58,0.3)] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.7)] sm:h-[26rem]">
            <MapView
              pandals={visiblePandals}
              selectedId={selectedPandal?.id ?? null}
              onSelect={setSelectedPandal}
              onDeselect={() => setSelectedPandal(null)}
              flyTo={coords}
              userLocation={coords}
            />

            {selectedPandal && (
              <div className="pointer-events-auto absolute left-3 top-3 w-64 max-w-[85%] rounded-2xl bg-white p-3 text-[color:var(--foreground)] shadow-xl">
                <button
                  type="button"
                  onClick={() => setSelectedPandal(null)}
                  aria-label="Close"
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
                <div className="flex gap-2.5 pr-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPandal.thumbnail_url || selectedPandal.image_url}
                    alt=""
                    className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <span className={`mb-0.5 inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${categoryInfo(selectedPandal.category).badgeClass}`}>
                      {categoryInfo(selectedPandal.category).label}
                    </span>
                    <p className="truncate text-sm font-semibold">{selectedPandal.name}</p>
                    <p className="truncate text-xs text-[color:var(--muted)]">{selectedPandal.address}</p>
                    <p className="mt-0.5 text-xs font-medium">
                      {selectedKm !== null && <span>{selectedKm.toFixed(1)} km · </span>}
                      <span className="text-[color:var(--utsav-crimson)]">
                        {getEventStatus(selectedPandal.event_date, selectedPandal.event_date_end) === "today"
                          ? "Live now"
                          : selectedPandal.timing_text}
                      </span>
                    </p>
                  </div>
                </div>
                <Link href={`/map?pandal=${selectedPandal.id}`} className="btn-crimson mt-3 w-full py-2! text-sm">
                  View Details
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Featured Celebrations ===== */}
      <section
        id="featured"
        className="scroll-mt-4 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/utsav-featured-bg.webp)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="utsav-eyebrow utsav-eyebrow-crimson">Handpicked for you</p>
              <h2 className="utsav-title mt-2 text-4xl text-[color:var(--foreground)] sm:text-5xl">Featured Celebrations</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)] sm:text-base">Popular pandals and dandiya nights near you</p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--utsav-crimson)] hover:underline"
            >
              View all events
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* Swipeable row on phones, grid from tablet up. */}
          <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:px-0 lg:grid-cols-4">
            {featured.map((pandal) => (
              <FeaturedCard
                key={pandal.id}
                pandal={pandal}
                coords={coords}
                saved={saved.includes(pandal.id)}
                onToggleSaved={() => toggleSaved(pandal.id)}
              />
            ))}
            {Array.from({ length: emptyFeaturedSlots }).map((_, i) => (
              <Link
                key={i}
                href="/submit?featured=1"
                className="group flex min-h-[19rem] w-[78%] flex-shrink-0 snap-start flex-col sm:w-auto items-center justify-center gap-3 rounded-[1.25rem] border-2 border-dashed border-[rgba(184,50,31,0.35)] bg-white/50 p-6 text-center transition-colors hover:border-[rgba(184,50,31,0.7)] hover:bg-white/80"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(184,50,31,0.1)] text-[color:var(--utsav-crimson)] transition-transform group-hover:scale-110">
                  <PlusIcon className="h-7 w-7" />
                </span>
                <span className="font-display text-lg font-bold text-[color:var(--foreground)]">Feature your celebration</span>
                <span className="max-w-[14rem] text-xs text-[color:var(--muted)]">
                  Get your pandal or dandiya night seen by everyone on the homepage.
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Plan your Navratri ===== */}
      <section
        id="plan"
        className="scroll-mt-4 bg-[color:var(--utsav-maroon)] bg-cover bg-center text-[color:var(--utsav-ink-light)]"
        style={{ backgroundImage: "url(/images/utsav-plan-bg.webp)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1px_1fr] lg:gap-12 lg:pl-40">
          <div>
            <p className="utsav-eyebrow">Plan your Navratri</p>
            <h2 className="utsav-title mt-3 flex items-center gap-x-2.5 whitespace-nowrap text-[1.7rem] sm:gap-x-3.5 sm:text-4xl">
              Discover
              <ArrowRightIcon className="h-5 w-5 flex-shrink-0 text-[color:var(--utsav-gold)] sm:h-6 sm:w-6" />
              Save
              <ArrowRightIcon className="h-5 w-5 flex-shrink-0 text-[color:var(--utsav-gold)] sm:h-6 sm:w-6" />
              Go
            </h2>
            <p className="mt-3 text-sm text-[color:var(--utsav-ink-light)]/80 sm:text-base">
              A simple way to make the most of this Navratri.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <PlanStep icon={<SearchIcon className="h-7 w-7" />} title="Discover" text="Find pandals and dandiya nights near you." />
              <PlanStep icon={<HeartIcon className="h-7 w-7" />} title="Save" text="Bookmark your favorite events." />
              <PlanStep icon={<SendIcon className="h-7 w-7" />} title="Go" text="Get directions and join the celebration." />
            </div>
          </div>

          <div aria-hidden="true" className="hidden bg-white/15 lg:block" />

          <div className="lg:pr-16">
            <p className="utsav-eyebrow">A festive evening itinerary</p>
            <div className="mt-6 space-y-5">
              <ItineraryRow icon={<TempleIcon className="h-5 w-5" />} title="Visit a Durga Maa Pandal" text="Darshan and soak in the festive vibes." />
              <ItineraryRow icon={<DiyaIcon className="h-5 w-5" />} title="Join the Aarti" text="Be part of the divine energy." />
              <ItineraryRow icon={<DandiyaIcon className="h-5 w-5" />} title="Dandiya Night" text="Dance, meet new people, feel the rhythm." />
              <ItineraryRow icon={<BowlIcon className="h-5 w-5" />} title="Festive Food" text="End the night with local delicacies." />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Know a celebration we missed? ===== */}
      <section
        className="bg-[color:var(--cream-100)] bg-cover bg-center"
        style={{ backgroundImage: "url(/images/utsav-cta-bg.webp)" }}
      >
        <div className="flex flex-col gap-6 px-4 py-14 sm:px-6 md:pl-[26%] md:pr-[20%] lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-xl rounded-2xl bg-[color:var(--cream-50)]/70 p-4 backdrop-blur-[2px] md:bg-transparent md:p-0 md:backdrop-blur-none">
            <p className="utsav-eyebrow utsav-eyebrow-crimson">Be a part of it</p>
            <h2 className="utsav-title mt-2 text-3xl text-[color:var(--utsav-crimson-deep)] sm:text-4xl">
              Know a celebration we missed?
            </h2>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Help us make Navaratri Utsav bigger. Add a pandal, dandiya night, cultural event or workshop in your area and help
              more people be part of the celebration.
            </p>
          </div>
          <Link href="/submit" className="btn-crimson self-start lg:self-center">
            <PlusIcon className="h-4 w-4" />
            Add a Celebration
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===== Publish ads / partner with us ===== */}
      <section className="bg-[linear-gradient(160deg,var(--utsav-wine-2)_0%,var(--utsav-wine)_60%,#260807_100%)] text-[color:var(--utsav-ink-light)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14">
          <div className="text-center lg:text-left">
            <p className="utsav-eyebrow">Partner with us</p>
            <h2 className="utsav-title mt-3 text-[1.9rem] sm:text-4xl">
              Grow your brand
              <br />
              <span className="text-[color:var(--utsav-gold)]">this Navratri.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-[color:var(--utsav-ink-light)]/80 sm:text-base lg:mx-0">
              Put your business in front of festival-goers across Hyderabad while they plan which pandals, dandiya nights and
              events to visit. Affordable 2-day slots, reviewed before going live.
            </p>
            <div className="mx-auto mt-6 flex max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start [&>*]:justify-center">
              <Link href="/ads" className="btn-gold">
                <MegaphoneIcon className="h-4 w-4" />
                Publish Ads
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <a href="mailto:bappaseva2026@gmail.com?subject=Partnership%20enquiry" className="btn-ghost-light">
                Partnership enquiry
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PartnerPerk icon={<UsersIcon className="h-5 w-5" />} title="Festival-ready audience" text="Reach people actively looking for celebrations to attend." />
            <PartnerPerk icon={<PinIcon className="h-5 w-5" />} title="Hyper-local reach" text="Be seen by visitors browsing celebrations near your business." />
            <PartnerPerk icon={<SparkleIcon className="h-5 w-5" />} title="Standout placements" text="Map slots, listing cards or a banner that flies across the map." />
            <PartnerPerk icon={<HeartIcon className="h-5 w-5" />} title="Support the community" text="Your ad keeps the festival map free for everyone." />
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[rgba(43,22,8,0.08)] bg-[color:var(--cream-50)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center lg:flex-row lg:justify-between lg:text-left">
          <Brand tagline size="lg" />
          <nav className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-[color:var(--muted)]">
            <Link href="/map" className="hover:text-[color:var(--utsav-crimson)]">Explore</Link>
            <Link href="/map?category=pandal" className="hover:text-[color:var(--utsav-crimson)]">Pandals</Link>
            <Link href="/map?category=dandiya" className="hover:text-[color:var(--utsav-crimson)]">Dandiya Nights</Link>
            <Link href="/map?category=cultural" className="hover:text-[color:var(--utsav-crimson)]">Events &amp; Workshops</Link>
            <a href="#plan" className="hover:text-[color:var(--utsav-crimson)]">Stories</a>
          </nav>
          <div className="flex items-center gap-4 text-[color:var(--foreground)]">
            <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-[color:var(--utsav-crimson)]">
              <InstagramIcon className="h-6 w-6" />
            </a>
           
            <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" aria-label="X" className="hover:text-[color:var(--utsav-crimson)]">
              <XLogoIcon className="h-5 w-5" />
            </a>
          </div>
          <p className="max-w-[14rem] text-sm text-[color:var(--muted)]">
            Made for the people who keep the celebration alive.{" "}
            <HeartIcon className="inline h-4 w-4 fill-[color:var(--utsav-crimson)] text-[color:var(--utsav-crimson)]" />
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-[color:var(--muted)] lg:text-left">
          Need help? Write to us at{" "}
          <a href="mailto:bappaseva2026@gmail.com" className="font-semibold text-[color:var(--utsav-crimson)] hover:underline">
            bappaseva2026@gmail.com
          </a>
        </p>
      </footer>
    </div>
  );
}

function HeroStat({ icon, top, bottom }: { icon: React.ReactNode; top: string; bottom: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[color:var(--utsav-gold)]">{icon}</span>
      <p className="text-xs leading-tight text-[color:var(--utsav-ink-light)]/90">
        <span className="font-semibold">{top}</span>
        <br />
        {bottom}
      </p>
    </div>
  );
}

function ChoiceTile({
  icon,
  title,
  text,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-[rgba(43,22,8,0.08)] bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[rgba(184,50,31,0.25)] hover:bg-[linear-gradient(135deg,#fff3e2,#ffe4cc)] hover:shadow-lg"
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe4a8,#e8a93a)] text-[color:var(--utsav-crimson-deep)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate whitespace-nowrap text-sm font-bold text-[color:var(--utsav-crimson)]">{title}</span>
        <span className="mt-0.5 block text-xs text-[color:var(--muted)]">{text}</span>
      </span>
      <ArrowRightIcon className="h-4 w-4 flex-shrink-0 text-[color:var(--muted)] transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/** The little coloured tag on a featured card's photo. */
function cardTag(pandal: Pandal): { label: string; className: string } {
  const status = getEventStatus(pandal.event_date, pandal.event_date_end);
  const isDandiya = pandal.category === "dandiya";
  if (status === "today") {
    return isDandiya
      ? { label: "Tonight", className: "bg-[#fde8b0] text-[#7a4a00]" }
      : { label: "Live now", className: "bg-[#d6f5dc] text-[#14642a]" };
  }
  const info = categoryInfo(pandal.category);
  return { label: info.label, className: info.badgeClass };
}

function FeaturedCard({
  pandal,
  coords,
  saved,
  onToggleSaved,
}: {
  pandal: Pandal;
  coords: { lat: number; lng: number } | null;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const tag = cardTag(pandal);
  const dateLabel = formatEventDateRange(pandal.event_date, pandal.event_date_end);
  const km = coords ? distanceKm(coords.lat, coords.lng, pandal.lat, pandal.lng) : null;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pandal.lat},${pandal.lng}`;

  return (
    <article className="relative flex w-[78%] flex-shrink-0 snap-start flex-col overflow-hidden sm:w-auto rounded-[1.25rem] bg-white shadow-[0_20px_45px_-25px_rgba(43,22,8,0.45)]">
      <Link href={`/map?pandal=${pandal.id}`} className="relative block aspect-[16/10] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pandal.image_url} alt={pandal.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${tag.className}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {tag.label}
        </span>
      </Link>
      <button
        type="button"
        onClick={onToggleSaved}
        aria-label={saved ? "Remove from saved" : "Save"}
        aria-pressed={saved}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
      >
        <HeartIcon className={`h-4 w-4 ${saved ? "fill-[#ff4d6d] text-[#ff4d6d]" : ""}`} />
      </button>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-display text-base font-bold text-[color:var(--foreground)]">{pandal.name}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-[color:var(--muted)]">
          <PinIcon className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--utsav-crimson)]" />
          <span className="truncate">{pandal.address}</span>
        </p>
        {(dateLabel || pandal.timing_text) && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
            <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--utsav-crimson)]" />
            <span className="truncate">{[dateLabel, pandal.timing_text].filter(Boolean).join(" · ")}</span>
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-[color:var(--foreground)]">
            <PinIcon className="h-3.5 w-3.5 text-[color:var(--utsav-crimson)]" />
            {km !== null ? `${km.toFixed(1)} km` : "Hyderabad"}
          </span>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[color:var(--utsav-crimson)] hover:underline"
          >
            Get directions
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

function PlanStep({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <span className="utsav-step-icon">{icon}</span>
      <p className="mt-3 text-sm font-semibold sm:mt-4 sm:text-base">{title}</p>
      <p className="mt-1 text-[0.7rem] text-[color:var(--utsav-ink-light)]/75 sm:text-xs">{text}</p>
    </div>
  );
}

function PartnerPerk({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[rgba(232,169,58,0.25)] bg-white/5 p-4 backdrop-blur-sm">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe4a8,#e8a93a)] text-[color:var(--utsav-crimson-deep)]">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-[color:var(--utsav-ink-light)]/70">{text}</p>
      </div>
    </div>
  );
}

function ItineraryRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="grid grid-cols-[2rem_1fr] items-start gap-3">
      <span className="text-[color:var(--utsav-gold)]">{icon}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-[color:var(--utsav-ink-light)]/70">{text}</p>
      </div>
    </div>
  );
}
