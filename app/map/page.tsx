"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdBannerSlideshow from "@/components/AdBannerSlideshow";
import Brand from "@/components/Brand";
import MapView from "@/components/MapView";
import PandalDetailCard from "@/components/PandalDetailCard";
import ProfileNavLink from "@/components/ProfileNavLink";
import { CalendarIcon, CloseIcon, ListIcon, MapIcon, MegaphoneIcon, PinIcon, PlusIcon, SearchIcon, UserIcon, VerifiedIcon } from "@/components/icons";
import { getEventStatus, eventStatusLabel } from "@/lib/eventStatus";
import { fetchJson } from "@/lib/fetchJson";
import { distanceKm } from "@/lib/geo";
import { isServedState } from "@/lib/servedArea";
import type { GeocodeResult, Pandal, Sponsor } from "@/lib/types";

type Filter = "all" | "today" | "open";
type LocationStatus = "idle" | "pending" | "granted" | "denied" | "unsupported" | "outside-area";
// "mandapams" = every listing (a mandapam serving annadhanam is still a
// mandapam); "annadhanams" narrows that down to just the ones with a food
// service date set. A subset, not a separate partition.
type Category = "annadhanams" | "mandapams";

const NEARBY_RADIUS_KM = 5;

function isToday(dateStr: string | null) {
  return !!dateStr && dateStr === new Date().toISOString().slice(0, 10);
}

function formatEventDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function MapPage() {
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pandal | null>(null);
  // Clicking the already-selected pandal again — its map pin or its list
  // row — closes the detail card instead of just re-opening the same one.
  const toggleSelected = (pandal: Pandal) => {
    setSelected((prev) => (prev?.id === pandal.id ? null : pandal));
  };
  const [showList, setShowList] = useState(false);
  // null = default height (the "max-h-[72%]" class below); once the user
  // drags, this holds an explicit px height so the sheet actually follows
  // the finger instead of only snapping once at the end of the gesture.
  const [sheetHeightPx, setSheetHeightPx] = useState<number | null>(null);
  const [sheetDragging, setSheetDragging] = useState(false);
  const listSheetRef = useRef<HTMLDivElement | null>(null);
  const listDrag = useRef<{ startY: number; startHeight: number } | null>(null);

  const clampSheetHeight = (h: number) => {
    const min = Math.min(220, window.innerHeight * 0.3);
    const max = window.innerHeight * 0.92;
    return Math.min(Math.max(h, min), max);
  };

  // Drag the sheet's handle to resize it, or tap it to snap between a
  // default and expanded height — the listings underneath scroll on their
  // own once they no longer fit.
  const handleListDragStart = (e: React.PointerEvent) => {
    const startHeight = listSheetRef.current?.getBoundingClientRect().height ?? window.innerHeight * 0.72;
    listDrag.current = { startY: e.clientY, startHeight };
    setSheetDragging(true);
    // Without pointer capture, dragging the finger off this small handle
    // (which is the whole point of a drag) hands pointermove/pointerup to
    // whatever's underneath instead, so the gesture silently never ends.
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleListDragMove = (e: React.PointerEvent) => {
    if (!listDrag.current) return;
    const delta = listDrag.current.startY - e.clientY;
    setSheetHeightPx(clampSheetHeight(listDrag.current.startHeight + delta));
  };
  const handleListDragEnd = (e: React.PointerEvent) => {
    setSheetDragging(false);
    if (!listDrag.current) return;
    const delta = listDrag.current.startY - e.clientY;
    listDrag.current = null;
    // Barely moved — treat it as a tap: snap between the default and
    // expanded heights instead of leaving it wherever that tiny jitter put it.
    if (Math.abs(delta) < 10) {
      const collapsedHeight = window.innerHeight * 0.72;
      const isNearDefault = sheetHeightPx === null || Math.abs(sheetHeightPx - collapsedHeight) < 20;
      setSheetHeightPx(isNearDefault ? window.innerHeight * 0.92 : null);
    }
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Picks up ?q= from the homepage's "Annadhanam near you" search box.
  const [query, setQuery] = useState(() =>
    typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("q") ?? "") : ""
  );
  const [filter, setFilter] = useState<Filter>("all");
  // "Mandapams" is the full directory — every listing is a mandapam, an
  // annadhanam-serving one included — so it's the safer default (never
  // empty just because nothing nearby happens to serve food today).
  const [category, setCategory] = useState<Category>("mandapams");
  // "Today"/"Open Now" are meaningless once a listing has no annadhanam
  // date at all, so switching to Mandapams also resets back to "All".
  const changeCategory = (c: Category) => {
    setCategory(c);
    setFilter("all");
  };
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  // The state name Nominatim resolved a rejected GPS fix or search to, so
  // the "not serving here" message can name it (e.g. "Karnataka").
  const [outOfAreaName, setOutOfAreaName] = useState<string | null>(null);
  // Set when a search resolves to a real place outside Telangana/Andhra
  // Pradesh — kept separate from the GPS-only outOfAreaName/locationStatus
  // since these are two different moments in the UI.
  const [searchOutOfArea, setSearchOutOfArea] = useState<string | null>(null);
  // Whether location is actually being USED right now — separate from
  // browser permission (locationStatus), since a permission grant can't be
  // "switched off" once given, but the app's own use of it can be. Flipping
  // this off just stops using the cached coords; flipping it back on reuses
  // them without asking the browser again.
  const [locationOn, setLocationOn] = useState(false);
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
  // Bumped on every search keystroke (not just every fetch) so an older
  // in-flight geocode request can never overwrite a newer one that happens
  // to resolve first — e.g. typing "jubilee", pausing long enough for that
  // request to go out, then continuing to "jubilee hills" before it returns.
  const searchReqId = useRef(0);

  useEffect(() => {
    fetchJson<{ pandals: Pandal[] }>("/api/pandals")
      .then((data) => {
        const list = data?.pandals ?? [];
        setPandals(list);
        // Picks up ?pandal= from the homepage's "View Details" link, so
        // clicking it actually opens that mandapam's card here instead of
        // just landing on a bare map.
        const pandalId = new URLSearchParams(window.location.search).get("pandal");
        const match = pandalId ? list.find((p) => p.id === pandalId) : null;
        if (match) {
          setSelected(match);
          setFlyTarget({ lat: match.lat, lng: match.lng });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // No pandal_id → the general, map-wide ad slots (not tied to a pandal).
    fetchJson<{ sponsors: Sponsor[] }>("/api/sponsors").then((data) => setSponsors(data?.sponsors ?? []));
  }, []);

  // Only ever asked for on an explicit tap (the "Enable Location"/"Near Me"
  // control) — never automatically on load. Two reasons: the full list is
  // shown regardless of location now, so there's nothing to unblock, and
  // some mobile browsers (iOS Safari included) silently ignore a permission
  // request that isn't triggered by a direct user gesture.
  //
  // Always re-queries the device rather than reusing cached coords — a
  // stale fix could silently hide that the user has since turned off
  // Location Services at the OS level, which needs to actually surface as
  // "denied" here so they know to switch it back on, not be papered over.
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        // Only Telangana/Andhra Pradesh are served — a GPS fix elsewhere
        // shouldn't silently center "near you" results on a place we have
        // nothing to show for.
        try {
          const res = await fetch(`/api/geocode?lat=${here.lat}&lon=${here.lng}`);
          const data = await res.json();
          const state = data?.address?.state as string | undefined;
          if (!isServedState(state)) {
            setOutOfAreaName(state ?? null);
            setLocationStatus("outside-area");
            return;
          }
        } catch {
          // Reverse-geocode failed — don't block a real GPS fix on a network hiccup.
        }
        setOutOfAreaName(null);
        setCoords(here);
        setLocationStatus("granted");
        setLocationOn(true);
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

  // The navbar location toggle: off -> on reuses cached coords instantly (or
  // asks the browser if we don't have any yet); on -> off just stops using
  // them for "near you" purposes without forgetting them, so switching back
  // on is instant.
  const toggleLocation = () => {
    if (locationOn) {
      setLocationOn(false);
      return;
    }
    requestLocation();
  };

  // Searching an area name (not just filtering the pandal list by text)
  // geocodes it, flies the map there, and re-centers the "near you" list on
  // that area instead of the user's real location — so searching "Mumbai"
  // shows mandapams near Mumbai even if they're actually somewhere else.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 3) {
      searchReqId.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAreaCenter(null);
      areaCenterRef.current = null;
      setSearchOutOfArea(null);
      return;
    }

    const reqId = ++searchReqId.current;
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data: GeocodeResult[] = await res.json();
        // A newer keystroke already started a fresher search — never let a
        // slower, stale request clobber it just because it resolved later.
        if (reqId !== searchReqId.current) return;
        const first = Array.isArray(data) ? data[0] : null;
        if (first) {
          const state = first.address?.state;
          if (!isServedState(state)) {
            setSearchOutOfArea(state ?? "that area");
            setAreaCenter(null);
            areaCenterRef.current = null;
            return;
          }
          setSearchOutOfArea(null);
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

  // Drops the searched area and goes back to showing mandapams around the
  // user's real location — without this, once someone searches an area
  // there was no way back to "near me" short of clearing the search box.
  const useMyLocation = () => {
    searchReqId.current += 1;
    setQuery("");
    setAreaCenter(null);
    areaCenterRef.current = null;
    if (coords) {
      setLocationOn(true);
      setFlyTarget(coords);
      setSidebarOpen(true);
      setShowList(true);
    } else {
      requestLocation();
    }
  };

  // A searched area takes priority over the user's own location for "near
  // you" purposes, whenever one is active. Location only counts when the
  // toggle is actually on — a permission grant alone doesn't mean it's in use.
  const effectiveCenter = areaCenter ?? (locationOn ? coords : null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pandals
      // "Annadhanams" narrows to the subset that serves food on a specific
      // date; "Mandapams" is everyone — an annadhanam-serving mandapam is
      // still a mandapam, so it shouldn't disappear from that view.
      .filter((p) => (category === "annadhanams" ? !!p.event_date : true))
      .filter((p) => (filter === "today" ? isToday(p.event_date) : true))
      // "Open Now" can't be computed precisely from a free-text timing string,
      // so it currently behaves like "All" — a real open/closed check would
      // need structured start/end times on the pandal record.
      //
      // Once the query has resolved to a geocoded area, it drives distance
      // filtering instead (see `nearby` below) — text-matching it against
      // name/address here too would wrongly hide every pandal that doesn't
      // literally mention "sainikpuri" in its address, even ones right there.
      .filter((p) => (q && !areaCenter ? p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) : true));
  }, [pandals, category, filter, query, areaCenter]);

  const withDistance = (p: Pandal) => (effectiveCenter ? distanceKm(effectiveCenter.lat, effectiveCenter.lng, p.lat, p.lng) : null);

  // Both your own GPS location and a searched area are capped to the same
  // radius — an area search used to skip this cap entirely (matching every
  // listing anywhere, just sorted by distance), which meant a search for a
  // specific neighborhood could surface a listing from an unrelated part of
  // the state instead of correctly showing nothing nearby.
  const nearby = useMemo(() => {
    if (!effectiveCenter) return filtered;
    const withKm = filtered.map((p) => ({ p, km: distanceKm(effectiveCenter.lat, effectiveCenter.lng, p.lat, p.lng) }));
    const scoped = withKm.filter(({ km }) => km <= NEARBY_RADIUS_KM);
    return scoped.sort((a, b) => a.km - b.km).map(({ p }) => p);
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
          <MapView pandals={filtered} selectedId={selected?.id ?? null} onSelect={toggleSelected} onDeselect={() => setSelected(null)} flyTo={flyTarget} />
        </div>

        <div className="pointer-events-none absolute inset-4 flex flex-col gap-4">
          <header className="nav-shell pointer-events-auto flex flex-shrink-0 items-center gap-4 px-5 py-3 sm:px-6">
            <Brand />
            <LocationToggle status={locationStatus} on={locationOn} onToggle={toggleLocation} />
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
                setSelected(null);
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
              Add Mandapam
            </Link>
            <ProfileNavLink />
          </header>

          <div className="flex min-h-0 flex-1 gap-4">
            {sidebarOpen && (
              <aside className="card-elevated pointer-events-auto flex w-[380px] flex-shrink-0 flex-col overflow-hidden">
                <div className="flex-shrink-0 p-5 pb-4">
                  <NearbyListHeader
                    areaCenter={areaCenter}
                    query={query}
                    effectiveCenter={effectiveCenter}
                    nearbyCount={nearby.length}
                    onClose={() => setSidebarOpen(false)}
                    onUseMyLocation={useMyLocation}
                    category={category}
                    onCategoryChange={changeCategory}
                    filter={filter}
                    onFilterChange={setFilter}
                    searchOutOfArea={searchOutOfArea}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                  {!effectiveCenter && <LocationPrompt status={locationStatus} outOfAreaName={outOfAreaName} onEnable={requestLocation} />}
                  <PandalList
                    pandals={nearby}
                    loading={loading}
                    selectedId={selected?.id ?? null}
                    distanceFor={withDistance}
                    onSelect={toggleSelected}
                    category={category}
                    nearbyScoped={!!effectiveCenter}
                    query={query}
                    onQueryChange={setQuery}
                  />
                </div>
              </aside>
            )}

            {selected ? (
              // Sharing this flex row with the ad panel (rather than
              // floating as a separate absolutely-positioned overlay) means
              // it's exactly as tall as the ad panel by construction, not
              // by guessing at a matching max-height.
              <div className="flex min-h-0 flex-1 justify-end">
                <PandalDetailCard pandal={selected} onClose={() => setSelected(null)} />
              </div>
            ) : (
              // Empty spacer — the live map shows through here, unobstructed.
              <div className="flex-1" />
            )}

            {!selected && <AdSlotPanel sponsors={sponsors} />}
          </div>
        </div>
      </div>

      {/* ===== Mobile layout (single view + bottom tab bar) ===== */}
      <div className="relative flex h-full flex-col lg:hidden">
        <header className="pointer-events-none absolute inset-x-3 top-3 z-20">
          <div className="nav-shell pointer-events-auto flex flex-col gap-2.5 px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <Brand />
              <LocationToggle status={locationStatus} on={locationOn} onToggle={toggleLocation} />
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
          <MapView pandals={filtered} selectedId={selected?.id ?? null} onSelect={toggleSelected} onDeselect={() => setSelected(null)} flyTo={flyTarget} />

          {/* Half-screen bottom sheet, over the map (not a separate page) —
              the map stays visible above it for context. */}
          {showList && (
            <div
              ref={listSheetRef}
              style={{ height: sheetHeightPx != null ? `${sheetHeightPx}px` : undefined }}
              className={`absolute inset-x-0 bottom-0 z-10 flex max-h-[92%] flex-col overflow-hidden rounded-t-3xl bg-[color:var(--cream-50)] shadow-[0_-24px_50px_-24px_rgba(43,22,8,0.4)] ${
                sheetHeightPx == null ? "h-[72%]" : ""
              } ${sheetDragging ? "" : "transition-[height] duration-200"}`}
            >
              <div className="flex-shrink-0 px-4 pb-3 pt-3">
                <div
                  onPointerDown={handleListDragStart}
                  onPointerMove={handleListDragMove}
                  onPointerUp={handleListDragEnd}
                  onPointerCancel={handleListDragEnd}
                  role="button"
                  aria-label="Drag to resize, or tap to expand or collapse the list"
                  className="-mx-4 -mt-1 flex touch-none cursor-grab justify-center px-4 pb-3 pt-2 active:cursor-grabbing"
                >
                  <div className="h-1.5 w-10 rounded-full bg-[rgba(43,22,8,0.15)]" />
                </div>
                <NearbyListHeader
                  areaCenter={areaCenter}
                  query={query}
                  effectiveCenter={effectiveCenter}
                  nearbyCount={nearby.length}
                  onClose={() => setShowList(false)}
                  onUseMyLocation={useMyLocation}
                  category={category}
                  onCategoryChange={changeCategory}
                  filter={filter}
                  onFilterChange={setFilter}
                  scrollableFilters
                  searchOutOfArea={searchOutOfArea}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-20">
                {!effectiveCenter && <LocationPrompt status={locationStatus} outOfAreaName={outOfAreaName} onEnable={requestLocation} />}
                <PandalList
                  pandals={nearby}
                  loading={loading}
                  selectedId={selected?.id ?? null}
                  distanceFor={withDistance}
                  onSelect={toggleSelected}
                  category={category}
                  nearbyScoped={!!effectiveCenter}
                  query={query}
                  onQueryChange={setQuery}
                />
              </div>
            </div>
          )}
        </div>

        {/* Centered popup card, mobile only — floats over the map (which
            stays visible behind the dimmed backdrop) instead of covering
            the whole screen or anchoring to an edge. */}
        {selected && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl shadow-2xl">
              <PandalDetailCard pandal={selected} onClose={() => setSelected(null)} fullScreen />
            </div>
          </div>
        )}

        {/* Bottom tab bar + ad strip */}
        {!selected && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-3">
            {!showList && <MobileAdStrip sponsors={sponsors} />}
            <nav className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-[rgba(43,22,8,0.08)] bg-[color:var(--cream-50)] p-1.5 shadow-[0_16px_40px_-14px_rgba(20,12,4,0.28)]">
              <TabButton
                active={!showList}
                icon={<MapIcon className="h-5 w-5" />}
                label="Map"
                onClick={() => {
                  setShowList(false);
                  setSheetHeightPx(null);
                }}
              />
              <TabButton
                active={showList}
                icon={<ListIcon className="h-5 w-5" />}
                label="List"
                onClick={() => setShowList(true)}
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

      {locationStatus === "outside-area" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-elevated w-full max-w-sm p-6 text-center">
            <span className="icon-tile icon-tile-circle mx-auto h-12 w-12">
              <PinIcon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-lg font-bold text-[color:var(--foreground)]">Not available in your area yet</p>
            <p className="mt-1.5 text-sm text-[color:var(--muted)]">
              Sorry, we&apos;re not servicing {outOfAreaName ?? "your location"} right now — BappaSeva currently
              covers Telangana and Andhra Pradesh only. Try searching a place there instead, like Hyderabad.
            </p>
            <button
              type="button"
              onClick={() => setLocationStatus("idle")}
              className="btn-primary mt-5 w-full justify-center py-2.5"
            >
              Got it
            </button>
          </div>
        </div>
      )}
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
    <aside className="card-elevated pointer-events-auto hidden w-56 flex-shrink-0 flex-col gap-2.5 overflow-hidden p-3 xl:flex">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-soft)]">Sponsored</p>
      {filled.map((sponsor) => {
        const images = sponsorImages(sponsor);
        const className = "min-h-0 flex-1 overflow-hidden rounded-xl border border-[rgba(234,108,29,0.35)]";
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
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[rgba(234,108,29,0.5)] px-2 text-center transition-colors hover:border-[rgba(234,108,29,0.8)] hover:bg-[rgba(234,108,29,0.05)]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(234,108,29,0.12)] text-[color:var(--accent-deep)]">
            <MegaphoneIcon className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold leading-tight text-[color:var(--foreground)]">Advertise here</span>
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
        const className = "h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-[rgba(234,108,29,0.35)] shadow-sm";
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
          className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[rgba(234,108,29,0.5)] bg-white/70 text-center"
        >
          <MegaphoneIcon className="h-3.5 w-3.5 text-[color:var(--accent-deep)]" />
          <span className="text-[0.625rem] font-semibold leading-tight text-[color:var(--foreground)]">Advertise</span>
        </Link>
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
/** A real on/off switch for location in the nav — flipping it on jumps the
 * map + list to the user's location (asking the browser only the first
 * time; cached coords are reused after that), flipping it off just stops
 * using them, without revoking anything at the browser level (which isn't
 * possible from the page anyway). */
function LocationToggle({
  status,
  on,
  onToggle,
}: {
  status: LocationStatus;
  on: boolean;
  onToggle: () => void;
}) {
  const pending = status === "pending";
  // Clicking the toggle and having nothing visibly happen (still off, no
  // explanation) reads as broken — this makes the reason explicit instead
  // of silently failing. "outside-area" gets its own popup instead of a
  // tooltip (see the modal in the parent), since that one needs more room
  // to explain than a small hint bubble.
  const hint =
    status === "denied"
      ? "Blocked — allow location for this site in your browser's settings, then try again."
      : status === "unsupported"
        ? "Location isn't supported on this browser."
        : null;
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending || status === "unsupported"}
        aria-pressed={on}
        className="flex items-center gap-1.5 rounded-full bg-[rgba(43,22,8,0.06)] py-1 pl-2.5 pr-1 text-xs font-semibold text-[color:var(--muted)] transition-colors disabled:opacity-60"
      >
        {pending ? "Locating…" : "Location"}
        <span
          className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors ${on ? "bg-green-600" : "bg-[rgba(43,22,8,0.2)]"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-3" : "translate-x-0"}`}
          />
        </span>
      </button>
      {hint && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-56 rounded-lg bg-[color:var(--foreground)] px-2.5 py-1.5 text-[0.6875rem] leading-snug text-white shadow-lg">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Shared title/subtitle/filter-chip header for the desktop sidebar and the
 * mobile bottom sheet — was duplicated between the two with a title that
 * never changed, even when the list was actually centered on a searched
 * area rather than the user's real location. */
function NearbyListHeader({
  areaCenter,
  query,
  effectiveCenter,
  nearbyCount,
  onClose,
  onUseMyLocation,
  category,
  onCategoryChange,
  filter,
  onFilterChange,
  scrollableFilters = false,
  searchOutOfArea = null,
}: {
  areaCenter: { lat: number; lng: number } | null;
  query: string;
  effectiveCenter: { lat: number; lng: number } | null;
  nearbyCount: number;
  onClose: () => void;
  onUseMyLocation: () => void;
  category: Category;
  onCategoryChange: (c: Category) => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  scrollableFilters?: boolean;
  searchOutOfArea?: string | null;
}) {
  const searchedPlace = query.trim();
  const noun = category === "annadhanams" ? "Annadhanam" : "Mandapam";
  // "Near You" is only honest once we're actually centered on the user's
  // real location — otherwise (no location, or a searched area) it's a
  // claim about proximity we can't back up.
  const title =
    areaCenter && searchedPlace
      ? `${noun}s near "${searchedPlace}"`
      : effectiveCenter
        ? `${noun} Near You`
        : `All ${noun}s`;

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold text-[color:var(--foreground)]">{title}</h2>
        <button
          type="button"
          aria-label="Close list"
          onClick={onClose}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] transition-colors hover:bg-[rgba(43,22,8,0.06)] hover:text-[color:var(--foreground)]"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      {searchOutOfArea && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-[rgba(234,108,29,0.35)] bg-white p-2.5 text-xs text-[color:var(--foreground)] shadow-sm">
          <PinIcon className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--accent-deep)]" />
          We&apos;re not serving {searchOutOfArea} yet — try a place in Telangana or Andhra Pradesh, like Hyderabad.
        </div>
      )}
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        {effectiveCenter
          ? `${nearbyCount} ${noun.toLowerCase()}${nearbyCount === 1 ? "" : "s"} within ${NEARBY_RADIUS_KM} km`
          : `${nearbyCount} ${noun.toLowerCase()}${nearbyCount === 1 ? "" : "s"}`}
      </p>
      {areaCenter && (
        <button
          type="button"
          onClick={onUseMyLocation}
          className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-[color:var(--accent-deep)] underline"
        >
          <PinIcon className="h-3.5 w-3.5" />
          Near me instead
        </button>
      )}

      {/* Mandapams is every listing — an annadhanam-serving one is still a
          mandapam. Annadhanams narrows down to just the ones that also
          serve food on a specific date. Not a partition: it's all vs. a
          subset of it. */}
      <div className="mt-3 flex gap-2">
        <FilterChip active={category === "mandapams"} onClick={() => onCategoryChange("mandapams")}>
          Mandapams
        </FilterChip>
        <FilterChip active={category === "annadhanams"} onClick={() => onCategoryChange("annadhanams")}>
          Annadhanams
        </FilterChip>
      </div>

      {category === "annadhanams" && (
        <div className={`mt-2 flex gap-2 ${scrollableFilters ? "overflow-x-auto" : ""}`}>
          <FilterChip active={filter === "all"} onClick={() => onFilterChange("all")}>
            All
          </FilterChip>
          <FilterChip active={filter === "today"} onClick={() => onFilterChange("today")}>
            Today
          </FilterChip>
          <FilterChip active={filter === "open"} onClick={() => onFilterChange("open")}>
            Open Now
          </FilterChip>
        </div>
      )}
    </>
  );
}

/** A slim, non-blocking nudge shown above the (already-visible) list —
 * location is now purely an enhancement for sorting by distance, never a
 * requirement to see anything, and it's only ever requested from here, on
 * an explicit tap. Auto-requesting on load used to also silently fail on
 * some mobile browsers (iOS Safari included), which won't show the
 * permission prompt unless it's triggered by a direct user gesture. */
function LocationPrompt({
  status,
  outOfAreaName,
  onEnable,
}: {
  status: LocationStatus;
  outOfAreaName: string | null;
  onEnable: () => void;
}) {
  if (status === "pending") {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[rgba(234,108,29,0.35)] bg-white shadow-sm p-3 text-sm text-[color:var(--foreground)]">
        <PinIcon className="h-4 w-4 flex-shrink-0 text-[color:var(--accent-deep)]" />
        Finding your location…
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[rgba(234,108,29,0.35)] bg-white shadow-sm p-3 text-sm text-[color:var(--foreground)]">
        <PinIcon className="h-4 w-4 flex-shrink-0 text-[color:var(--accent-deep)]" />
        Location isn&apos;t supported here — search an area above to sort by distance.
      </div>
    );
  }

  if (status === "outside-area") {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[rgba(234,108,29,0.35)] bg-white shadow-sm p-3 text-sm text-[color:var(--foreground)]">
        <PinIcon className="h-4 w-4 flex-shrink-0 text-[color:var(--accent-deep)]" />
        We&apos;re not serving {outOfAreaName ?? "your area"} yet — search a place in Telangana or Andhra Pradesh
        (e.g. Hyderabad) above.
      </div>
    );
  }

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-[rgba(234,108,29,0.35)] bg-white shadow-sm p-3">
      <p className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
        <PinIcon className="h-4 w-4 flex-shrink-0 text-[color:var(--accent-deep)]" />
        {status === "denied"
          ? "Location is off — enable it to see what's near you, or search an area above."
          : "Turn on location to see what's near you, or just search an area above."}
      </p>
      <button type="button" onClick={onEnable} className="btn-primary w-full justify-center py-1.5 text-sm">
        Enable Location
      </button>
    </div>
  );
}

function PandalList({
  pandals,
  loading,
  selectedId,
  distanceFor,
  onSelect,
  category,
  nearbyScoped = false,
  query,
  onQueryChange,
}: {
  pandals: Pandal[];
  loading: boolean;
  selectedId: string | null;
  distanceFor: (p: Pandal) => number | null;
  onSelect: (p: Pandal) => void;
  category: Category;
  /** True once the list has been narrowed to a location (GPS or a searched
   * area), so the empty state can say "none nearby" instead of implying
   * nothing has been published anywhere. */
  nearbyScoped?: boolean;
  /** When given, an inline manual search offers a way out that doesn't
   * depend on noticing the nav's search box on its own. */
  query?: string;
  onQueryChange?: (q: string) => void;
}) {
  const noun = category === "annadhanams" ? "annadhanam" : "mandapam";
  if (loading) {
    return <p className="p-6 text-center text-sm text-[color:var(--muted)]">Loading {noun}s…</p>;
  }
  if (pandals.length === 0) {
    return (
      <div className="space-y-3 p-6 text-center">
        <p className="text-sm text-[color:var(--muted)]">
          {nearbyScoped
            ? `No ${noun}s within ${NEARBY_RADIUS_KM} km yet.`
            : `No ${noun}s published yet. Be the first to add one!`}
        </p>
        {nearbyScoped && onQueryChange && (
          <label className="flex items-center gap-2 rounded-full border border-[rgba(43,22,8,0.14)] bg-white px-4 py-2 text-left text-sm text-[color:var(--muted)]">
            <SearchIcon className="h-4 w-4 flex-shrink-0" />
            <input
              value={query ?? ""}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Try a different area — e.g. Hyderabad"
              className="w-full bg-transparent text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-soft)]"
            />
          </label>
        )}
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {pandals.map((pandal) => {
        const km = distanceFor(pandal);
        const eventStatus = getEventStatus(pandal.event_date);
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
                {pandal.event_date && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-[color:var(--accent-deep)]">
                    <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                    {formatEventDate(pandal.event_date)}
                    {pandal.timing_text ? ` · ${pandal.timing_text}` : ""}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  {eventStatus && (
                    <span className={eventStatus === "today" ? "badge-live" : "badge-live opacity-70"}>
                      {eventStatusLabel(eventStatus)}
                    </span>
                  )}
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
