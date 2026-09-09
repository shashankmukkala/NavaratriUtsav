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
  const [locationStatus, setLocationStatus] = useState<"idle" | "pending" | "granted" | "denied" | "unsupported">("idle");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  // Where the map should fly to next — set when the user's own location
  // resolves, or when they search an area name. Pins/list filtering stay
  // driven by `query`/`coords` directly; this is purely camera movement.
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  // Set once a searched area name resolves — while active, this (not the
  // user's own coords) is what "near you" is centered on, so searching
  // Mumbai shows mandapams near Mumbai even if the user is really in Pune.
  const [areaCenter, setAreaCenter] = useState<{ lat: number; lng: number } | null>(null);
  // Mirrors areaCenter for the async geolocation callback below, which
  // closes over stale state otherwise — without this, a slow GPS fix that
  // resolves after the user has already searched an area silently snaps
  // the camera back to their real location, clobbering the search.
  const areaCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchJson<{ pandals: Pandal[] }>("/api/pandals")
      .then((data) => setPandals(data?.pandals ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // No pandal_id → the general, map-wide ad slots (not tied to a pandal).
    fetchJson<{ sponsors: Sponsor[] }>("/api/sponsors").then((data) => setSponsors(data?.sponsors ?? []));
  }, []);

  // Asked for as soon as the map loads — the "near you" list is genuinely
  // meaningless without a location, so we ask right away and show why if
  // it's denied/unavailable, rather than silently listing everything.
  const requestLocation = () => {
    if (coords) {
      setLocationStatus("granted");
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoords(here);
        setLocationStatus("granted");
        // Don't fly the camera away from an area the user already searched
        // for — this GPS fix may have just been slow to resolve.
        if (!areaCenterRef.current) setFlyTarget(here);
        // Once we actually know where they are, go straight to showing the
        // nearby list instead of leaving them looking at a bare map.
        setSidebarOpen(true);
        setShowList(true);
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Searching an area name (not just filtering the pandal list by text)
  // geocodes it, flies the map there, and re-centers the "near you" list on
  // that area instead of the user's real location — so searching "Mumbai"
  // shows mandapams near Mumbai even if they're actually somewhere else.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAreaCenter(null);
      areaCenterRef.current = null;
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : null;
        if (first) {
          const at = { lat: Number(first.lat), lng: Number(first.lon) };
          setFlyTarget(at);
          setAreaCenter(at);
          areaCenterRef.current = at;
        }
      } catch {
        // No connectivity to the geocoder — the text filter above still works.
      }
    }, 500);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  // A searched area takes priority over the user's own location for "near
  // you" purposes, whenever one is active.
  const effectiveCenter = areaCenter ?? coords;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pandals
      .filter((p) => (filter === "today" ? isToday(p.event_date) : true))
      // "Open Now" can't be computed precisely from a free-text timing string,
      // so it currently behaves like "All" — a real open/closed check would
      // need structured start/end times on the pandal record.
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) : true));
  }, [pandals, filter, query]);

  const withDistance = (p: Pandal) => (effectiveCenter ? distanceKm(effectiveCenter.lat, effectiveCenter.lng, p.lat, p.lng) : null);

  // The sidebar/mobile list is scoped to nearby mandapams (sorted closest
  // first) so it reads like a real "near you" list, not just every listing
  // in publish order — the map pins themselves stay unfiltered by distance.
  const nearby = useMemo(() => {
    if (!effectiveCenter) return filtered;
    return filtered
      .map((p) => ({ p, km: distanceKm(effectiveCenter.lat, effectiveCenter.lng, p.lat, p.lng) }))
      .filter(({ km }) => km <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.km - b.km)
      .map(({ p }) => p);
  }, [filtered, effectiveCenter]);

  return (
    <div className="h-dvh w-full overflow-hidden bg-[var(--background)]">
      {/* ===== Desktop / tablet layout ===== */}
      <div className="relative hidden h-full lg:block">
        {/* Full-bleed map, base layer — the nav bar and sidebar float on top
            of this as real glass panels (see GlassBlurLayer) so they mirror
            and blur the live map behind them, instead of sitting beside a
            separately-framed map panel with nothing to blur. */}
        <div className="absolute inset-4 overflow-hidden rounded-[2rem] border border-[rgba(43,22,8,0.08)] shadow-[0_28px_70px_-30px_rgba(43,22,8,0.35)]">
          <MapView pandals={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} flyTo={flyTarget} />
        </div>

        <div className="pointer-events-none absolute inset-4 flex flex-col gap-4">
          <header className="nav-shell pointer-events-auto flex flex-shrink-0 items-center gap-4 px-5 py-3 sm:px-6">
            <Brand />
            <LocationBadge status={locationStatus} onRetry={requestLocation} />
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
              Add your Mandapam Seva
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
                    {effectiveCenter
                      ? `${nearby.length} mandapam${nearby.length === 1 ? "" : "s"} within ${NEARBY_RADIUS_KM} km`
                      : "Your location is needed to show mandapams near you."}
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
                  {!effectiveCenter ? (
                    <LocationGate status={locationStatus} onRetry={requestLocation} query={query} onQueryChange={setQuery} />
                  ) : (
                    <PandalList
                      pandals={nearby}
                      loading={loading}
                      selectedId={selected?.id ?? null}
                      distanceFor={withDistance}
                      onSelect={setSelected}
                      nearbyScoped={!!effectiveCenter}
                    />
                  )}
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
          <div className="nav-shell pointer-events-auto flex flex-col gap-2.5 px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <Brand />
              <LocationBadge status={locationStatus} onRetry={requestLocation} />
            </div>
            <label className="flex items-center gap-2 rounded-full border border-[rgba(43,22,8,0.12)] bg-white/70 px-4 py-2 text-sm text-[color:var(--muted)]">
              <SearchIcon className="h-4 w-4 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your area or city…"
                className="w-full bg-transparent text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-soft)]"
              />
            </label>
          </div>
        </header>

        <div className="relative flex-1">
          <MapView pandals={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} flyTo={flyTarget} />

          {/* Half-screen bottom sheet, over the map (not a separate page) —
              the map stays visible above it for context. */}
          {showList && (
            <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[72%] flex-col overflow-hidden rounded-t-3xl bg-[color:var(--cream-50)] shadow-[0_-24px_50px_-24px_rgba(43,22,8,0.4)]">
              <div className="flex-shrink-0 px-4 pb-3 pt-3">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[rgba(43,22,8,0.15)]" />
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-[color:var(--foreground)]">Annadhanam Near You</h2>
                  <button
                    type="button"
                    aria-label="Close list"
                    onClick={() => setShowList(false)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] transition-colors hover:bg-[rgba(43,22,8,0.06)]"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {effectiveCenter
                    ? `${nearby.length} mandapam${nearby.length === 1 ? "" : "s"} within ${NEARBY_RADIUS_KM} km`
                    : "Your location is needed to show mandapams near you."}
                </p>
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
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-20">
                {!effectiveCenter ? (
                  <LocationGate status={locationStatus} onRetry={requestLocation} query={query} onQueryChange={setQuery} />
                ) : (
                  <PandalList
                    pandals={nearby}
                    loading={loading}
                    selectedId={selected?.id ?? null}
                    distanceFor={withDistance}
                    onSelect={setSelected}
                    nearbyScoped={!!effectiveCenter}
                  />
                )}
              </div>
            </div>
          )}
        </div>

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
    <aside className="card-elevated pointer-events-auto hidden w-48 flex-shrink-0 flex-col gap-2.5 overflow-hidden p-2.5 xl:flex">
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
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(234,108,29,0.12)] text-[color:var(--accent-deep)]">
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
          className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.18)] bg-white/70 text-center"
        >
          <MegaphoneIcon className="h-3.5 w-3.5 text-[color:var(--accent-deep)]" />
          <span className="text-[0.6rem] font-semibold leading-tight text-[color:var(--foreground)]">Advertise</span>
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

/** Blocks the "near you" list until location is actually granted — showing
 * everything unfiltered when we don't know where the user is would defeat
 * the point of a "near you" list, so this is a hard requirement, not a
 * silent fallback. */
/** Small "is location on?" status chip in the nav — click to retry when
 * it's off, so it also doubles as the enable-location control up top. */
function LocationBadge({
  status,
  onRetry,
}: {
  status: "idle" | "pending" | "granted" | "denied" | "unsupported";
  onRetry: () => void;
}) {
  const on = status === "granted";
  return (
    <button
      type="button"
      onClick={on ? undefined : onRetry}
      disabled={status === "pending" || status === "unsupported"}
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
        on
          ? "bg-[rgba(34,139,34,0.12)] text-green-800"
          : "bg-[rgba(43,22,8,0.06)] text-[color:var(--muted)] hover:bg-[rgba(234,108,29,0.1)]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-green-600" : "bg-[color:var(--muted-soft)]"}`} />
      {status === "pending" ? "Locating…" : on ? "Location: On" : "Location: Off"}
    </button>
  );
}

function LocationGate({
  status,
  onRetry,
  query,
  onQueryChange,
}: {
  status: "idle" | "pending" | "granted" | "denied" | "unsupported";
  onRetry: () => void;
  query: string;
  onQueryChange: (q: string) => void;
}) {
  if (status === "pending") {
    return <p className="p-6 text-center text-sm text-[color:var(--muted)]">Finding mandapams near you…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-[rgba(43,22,8,0.04)] p-6 text-center">
      <span className="icon-tile icon-tile-circle h-11 w-11">
        <PinIcon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Location required</p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {status === "unsupported"
            ? "Your browser doesn't support location — search an area below instead."
            : status === "denied"
              ? "We need your location to show mandapams near you — enable it for this site, or search an area below."
              : "We need your location to show mandapams near you."}
        </p>
      </div>

      {status !== "unsupported" && (
        <button type="button" onClick={onRetry} className="btn-primary w-full justify-center py-2 text-sm">
          Enable Location
        </button>
      )}

      <div className="flex w-full items-center gap-2 text-xs text-[color:var(--muted-soft)]">
        <span className="h-px flex-1 bg-[rgba(43,22,8,0.12)]" />
        or
        <span className="h-px flex-1 bg-[rgba(43,22,8,0.12)]" />
      </div>

      <label className="flex w-full items-center gap-2 rounded-full border border-[rgba(43,22,8,0.14)] bg-white px-4 py-2 text-sm text-[color:var(--muted)]">
        <SearchIcon className="h-4 w-4 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search manually — e.g. Jubilee Hills"
          className="w-full bg-transparent text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-soft)]"
        />
      </label>
    </div>
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
