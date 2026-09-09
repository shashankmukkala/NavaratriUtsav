"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import GlassBlurLayer from "@/components/GlassBlurLayer";
import MapView from "@/components/MapView";
import PandalDetailCard from "@/components/PandalDetailCard";
import ProfileNavLink from "@/components/ProfileNavLink";
import { CloseIcon, ListIcon, MapIcon, MegaphoneIcon, PinIcon, PlusIcon, SearchIcon, UserIcon, VerifiedIcon } from "@/components/icons";
import { fetchJson } from "@/lib/fetchJson";
import { distanceKm } from "@/lib/geo";
import type { Pandal, Sponsor } from "@/lib/types";

type Filter = "all" | "today" | "open";

const NEARBY_RADIUS_KM = 5;

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export default function MapPage() {
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pandal | null>(null);
  const [showList, setShowList] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Picks up ?q= from the homepage's "Annadhanam near you" search box.
  const [query, setQuery] = useState(() =>
    typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("q") ?? "") : ""
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    fetchJson<{ pandals: Pandal[] }>("/api/pandals")
      .then((data) => setPandals(data?.pandals ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // No pandal_id → the general, map-wide ad slots (not tied to a pandal).
    fetchJson<{ sponsors: Sponsor[] }>("/api/sponsors").then((data) => setSponsors(data?.sponsors ?? []));
  }, []);

  // Only asked for once the user actually opens the list (not automatically
  // on page load) — the map itself works fine with no location at all.
  const requestLocation = () => {
    if (coords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pandals
      .filter((p) => (filter === "today" ? isToday(p.event_date) : true))
      // "Open Now" can't be computed precisely from a free-text timing string,
      // so it currently behaves like "All" — a real open/closed check would
      // need structured start/end times on the pandal record.
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) : true));
  }, [pandals, filter, query]);

  const withDistance = (p: Pandal) => (coords ? distanceKm(coords.lat, coords.lng, p.lat, p.lng) : null);

  // The sidebar/mobile list is scoped to nearby mandapams (sorted closest
  // first) so it reads like a real "near you" list, not just every listing
  // in publish order — the map pins themselves stay unfiltered by distance.
  const nearby = useMemo(() => {
    if (!coords) return filtered;
    return filtered
      .map((p) => ({ p, km: distanceKm(coords.lat, coords.lng, p.lat, p.lng) }))
      .filter(({ km }) => km <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.km - b.km)
      .map(({ p }) => p);
  }, [filtered, coords]);

  return (
    <div className="h-dvh w-full overflow-hidden bg-[var(--background)]">
      {/* ===== Desktop / tablet layout ===== */}
      <div className="relative hidden h-full lg:block">
        {/* Full-bleed map, base layer — the nav bar and sidebar float on top
            of this as real glass panels (see GlassBlurLayer) so they mirror
            and blur the live map behind them, instead of sitting beside a
            separately-framed map panel with nothing to blur. */}
        <div className="absolute inset-4 overflow-hidden rounded-[2rem] border border-[rgba(43,22,8,0.08)] shadow-[0_28px_70px_-30px_rgba(43,22,8,0.35)]">
          <MapView pandals={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} />
        </div>

        <div className="pointer-events-none absolute inset-4 flex flex-col gap-4">
          <header className="nav-shell pointer-events-auto flex flex-shrink-0 items-center gap-4 px-4 py-2.5 sm:px-5">
            <Brand />
            <label className="flex flex-1 items-center gap-2 rounded-full border border-[rgba(43,22,8,0.12)] bg-white/70 px-4 py-2 text-sm text-[color:var(--muted)]">
              <SearchIcon className="h-4 w-4 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your area or city…"
                className="w-full bg-transparent text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-soft)]"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setSidebarOpen((v) => !v);
                requestLocation();
              }}
              className="btn-secondary flex-shrink-0"
            >
              <ListIcon className="h-4 w-4" />
              List
            </button>
            <Link href="/ads" className="btn-secondary flex-shrink-0">
              <MegaphoneIcon className="h-4 w-4" />
              Publish Ads
            </Link>
            <Link href="/submit" className="btn-primary flex-shrink-0">
              <PlusIcon className="h-4 w-4" />
              Add Seva
            </Link>
            <ProfileNavLink />
          </header>

          <div className="flex min-h-0 flex-1 gap-4">
            {sidebarOpen && (
              <aside className="card-elevated pointer-events-auto flex w-[380px] flex-shrink-0 flex-col overflow-hidden">
                <div className="flex-shrink-0 p-5 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-[color:var(--foreground)]">Annadhanam Near You</h2>
                    <button
                      type="button"
                      aria-label="Close list"
                      onClick={() => setSidebarOpen(false)}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] transition-colors hover:bg-[rgba(43,22,8,0.06)] hover:text-[color:var(--foreground)]"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {coords
                      ? `${nearby.length} mandapam${nearby.length === 1 ? "" : "s"} within ${NEARBY_RADIUS_KM} km`
                      : "Find where food is being served during Ganesh Chaturthi."}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                      All
                    </FilterChip>
                    <FilterChip active={filter === "today"} onClick={() => setFilter("today")}>
                      Today
                    </FilterChip>
                    <FilterChip active={filter === "open"} onClick={() => setFilter("open")}>
                      Open Now
                    </FilterChip>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                  <PandalList
                    pandals={nearby}
                    loading={loading}
                    selectedId={selected?.id ?? null}
                    distanceFor={withDistance}
                    onSelect={setSelected}
                    nearbyScoped={!!coords}
                  />
                </div>
              </aside>
            )}

            {/* Empty spacer — the live map shows through here, unobstructed. */}
            <div className="flex-1" />

            <AdSlotPanel sponsors={sponsors} />
          </div>
        </div>

        {selected && (
          <div className="pointer-events-none absolute inset-4 flex items-start justify-end pt-24">
            <PandalDetailCard pandal={selected} onClose={() => setSelected(null)} glass />
          </div>
        )}
      </div>

      {/* ===== Mobile layout (single view + bottom tab bar) ===== */}
      <div className="relative flex h-full flex-col lg:hidden">
        <header className="pointer-events-none absolute inset-x-3 top-3 z-20">
          <div className="nav-shell pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5">
            <Brand />
            <ProfileNavLink />
          </div>
        </header>

        {!showList ? (
          <div className="relative flex-1">
            <MapView pandals={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden bg-[color:var(--cream-50)] pt-16">
            <div className="flex-shrink-0 px-4 pb-3">
              <h2 className="text-lg font-bold text-[color:var(--foreground)]">Annadhanam Near You</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {coords
                  ? `${nearby.length} mandapam${nearby.length === 1 ? "" : "s"} within ${NEARBY_RADIUS_KM} km`
                  : "Find where food is being served during Ganesh Chaturthi."}
              </p>
              <label className="mt-3 flex items-center gap-2 rounded-full border border-[rgba(43,22,8,0.12)] bg-white/70 px-4 py-2.5 text-sm text-[color:var(--muted)]">
                <SearchIcon className="h-4 w-4 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your area or city…"
                  className="w-full bg-transparent text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-soft)]"
                />
              </label>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                  All
                </FilterChip>
                <FilterChip active={filter === "today"} onClick={() => setFilter("today")}>
                  Today
                </FilterChip>
                <FilterChip active={filter === "open"} onClick={() => setFilter("open")}>
                  Open Now
                </FilterChip>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-24">
              <PandalList
                pandals={nearby}
                loading={loading}
                selectedId={selected?.id ?? null}
                distanceFor={withDistance}
                onSelect={setSelected}
                nearbyScoped={!!coords}
              />
            </div>
          </div>
        )}

        {/* Full-screen detail view, mobile only */}
        {selected && (
          <div className="absolute inset-0 z-30 bg-[color:var(--cream-50)]">
            <PandalDetailCard pandal={selected} onClose={() => setSelected(null)} fullScreen />
          </div>
        )}

        {/* Bottom tab bar + ad strip */}
        {!selected && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-3">
            {!showList && <MobileAdStrip sponsors={sponsors} />}
            <nav className="map-panel pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5">
              <GlassBlurLayer />
              <TabButton active={!showList} icon={<MapIcon className="h-5 w-5" />} label="Map" onClick={() => setShowList(false)} />
              <TabButton
                active={showList}
                icon={<ListIcon className="h-5 w-5" />}
                label="List"
                onClick={() => {
                  setShowList(true);
                  requestLocation();
                }}
              />
              <Link href="/submit" className="flex flex-col items-center gap-0.5 rounded-xl px-5 py-2 text-[color:var(--muted)]">
                <PlusIcon className="h-5 w-5" />
                <span className="text-[0.6875rem] font-semibold">Add</span>
              </Link>
              <Link href="/profile" className="flex flex-col items-center gap-0.5 rounded-xl px-5 py-2 text-[color:var(--muted)]">
                <UserIcon className="h-5 w-5" />
                <span className="text-[0.6875rem] font-semibold">You</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-xl px-5 py-2 transition-colors ${
        active ? "bg-[color:var(--accent)]/12 text-[color:var(--accent-deep)]" : "text-[color:var(--muted)]"
      }`}
    >
      {icon}
      <span className="text-[0.6875rem] font-semibold">{label}</span>
    </button>
  );
}

const AD_SLOT_COUNT = 4;

/** Vertical stack of exactly AD_SLOT_COUNT ad slots on the right of the
 * map. Approved sponsor banners (paid ads shown on the map screen, not tied
 * to any pandal) fill the slots first; any remaining slots show an empty
 * "Advertise here" placeholder that links into the sponsor flow. */
function sponsorImages(sponsor: Sponsor): string[] {
  if (sponsor.banner_image_urls && sponsor.banner_image_urls.length > 0) return sponsor.banner_image_urls;
  return sponsor.banner_image_url ? [sponsor.banner_image_url] : [];
}

function AdSlotPanel({ sponsors }: { sponsors: Sponsor[] }) {
  const filled = sponsors.filter((s) => sponsorImages(s).length > 0).slice(0, AD_SLOT_COUNT);
  const emptySlots = AD_SLOT_COUNT - filled.length;

  return (
    <aside className="card-elevated pointer-events-auto hidden w-44 flex-shrink-0 flex-col gap-2 overflow-hidden p-2.5 xl:flex">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-soft)]">Sponsored</p>
      {filled.map((sponsor) => {
        const images = sponsorImages(sponsor);
        const className = "min-h-0 flex-1 overflow-hidden rounded-xl border border-[rgba(43,22,8,0.1)]";
        return sponsor.link_url ? (
          <a key={sponsor.id} href={sponsor.link_url} target="_blank" rel="noopener noreferrer" className={className}>
            <AdBannerSlideshow images={images} alt={sponsor.sponsor_name} />
          </a>
        ) : (
          <div key={sponsor.id} className={className}>
            <AdBannerSlideshow images={images} alt={sponsor.sponsor_name} />
          </div>
        );
      })}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <Link
          key={i}
          href="/sponsor"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.16)] px-2 text-center transition-colors hover:border-[rgba(234,108,29,0.5)] hover:bg-[rgba(234,108,29,0.05)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(234,108,29,0.12)] text-[color:var(--accent-deep)]">
            <MegaphoneIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[0.6875rem] font-semibold leading-tight text-[color:var(--foreground)]">Advertise here</span>
        </Link>
      ))}
    </aside>
  );
}

/** Mobile equivalent of AdSlotPanel — a horizontally scrollable row of the
 * same square ad slots, sitting just above the bottom tab bar instead of
 * down the side of the screen. */
function MobileAdStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const filled = sponsors.filter((s) => sponsorImages(s).length > 0).slice(0, AD_SLOT_COUNT);
  const emptySlots = AD_SLOT_COUNT - filled.length;

  return (
    <div className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto px-1 pb-0.5">
      {filled.map((sponsor) => {
        const images = sponsorImages(sponsor);
        const className = "h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[rgba(43,22,8,0.12)] shadow-sm";
        return sponsor.link_url ? (
          <a key={sponsor.id} href={sponsor.link_url} target="_blank" rel="noopener noreferrer" className={className}>
            <AdBannerSlideshow images={images} alt={sponsor.sponsor_name} />
          </a>
        ) : (
          <div key={sponsor.id} className={className}>
            <AdBannerSlideshow images={images} alt={sponsor.sponsor_name} />
          </div>
        );
      })}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <Link
          key={i}
          href="/sponsor"
          className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.18)] bg-white/70 text-center"
        >
          <MegaphoneIcon className="h-3.5 w-3.5 text-[color:var(--accent-deep)]" />
          <span className="text-[0.55rem] font-semibold leading-tight text-[color:var(--foreground)]">Advertise</span>
        </Link>
      ))}
    </div>
  );
}

const SLIDE_INTERVAL_MS = 4000;

/** Cycles through a sponsor's banner images (if more than one) with a soft
 * crossfade — a lightweight slideshow for the ad slot. */
function AdBannerSlideshow({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % images.length;
      setIndex(indexRef.current);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div className="relative h-full w-full">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`filter-chip ${active ? "filter-chip-active" : ""}`}>
      {children}
    </button>
  );
}

function PandalList({
  pandals,
  loading,
  selectedId,
  distanceFor,
  onSelect,
  nearbyScoped = false,
}: {
  pandals: Pandal[];
  loading: boolean;
  selectedId: string | null;
  distanceFor: (p: Pandal) => number | null;
  onSelect: (p: Pandal) => void;
  /** True once the list has been narrowed to a radius around the user's
   * location, so the empty state can say "none nearby" instead of implying
   * nothing has been published anywhere. */
  nearbyScoped?: boolean;
}) {
  if (loading) {
    return <p className="p-6 text-center text-sm text-[color:var(--muted)]">Loading mandapams…</p>;
  }
  if (pandals.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-[color:var(--muted)]">
        {nearbyScoped
          ? `No mandapams within ${NEARBY_RADIUS_KM} km yet.`
          : "No mandapams published yet. Be the first to add one!"}
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {pandals.map((pandal) => {
        const km = distanceFor(pandal);
        const live = isToday(pandal.event_date);
        return (
          <li key={pandal.id}>
            <button onClick={() => onSelect(pandal)} className={`list-row w-full ${selectedId === pandal.id ? "list-row-active" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pandal.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{pandal.name}</p>
                <p className="truncate text-xs text-[color:var(--muted)]">
                  {km !== null ? `${km.toFixed(1)} km · ` : ""}
                  {pandal.address}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-[color:var(--accent-deep)]">{pandal.timing_text}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={live ? "badge-live" : "badge-live opacity-70"}>{live ? "Serving Now" : "Open"}</span>
                  <span className="badge-verified">
                    <VerifiedIcon className="h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>
              </div>
              <PinIcon className="h-4 w-4 flex-shrink-0 text-[color:var(--muted-soft)]" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
