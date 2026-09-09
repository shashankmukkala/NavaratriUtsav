"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/mapWorker";
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, OPENFREEMAP_STYLE_URL } from "@/lib/mapStyle";
import { CrosshairIcon, PinIcon, SearchIcon } from "@/components/icons";
import type { GeocodeResult } from "@/lib/types";

interface LocationPickerProps {
  onChange: (location: { lat: number; lng: number; address: string }) => void;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
    const data = await res.json();
    return typeof data?.display_name === "string" ? data.display_name : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

/** A map with a draggable pin plus an address search box, used to pick an exact
 * location when submitting a pandal. Calling onChange keeps the parent form's
 * lat/lng/address fields in sync with the pin. Uses the free MapLibre +
 * OpenFreeMap + Nominatim stack — no paid map API. */
export default function LocationPicker({ onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [locating, setLocating] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const movePin = async (lat: number, lng: number, panTo = true) => {
    markerRef.current?.setLngLat([lng, lat]);
    if (panTo) mapRef.current?.easeTo({ center: [lng, lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 400 });
    const address = await reverseGeocode(lat, lng);
    onChangeRef.current({ lat, lng, address });
  };
  const movePinRef = useRef(movePin);
  useEffect(() => {
    movePinRef.current = movePin;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;

    const marker = new Marker({ color: "#EA580C", draggable: true })
      .setLngLat(DEFAULT_MAP_CENTER)
      .addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      movePinRef.current(lat, lng, false);
    });

    map.on("click", (e) => {
      movePinRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => setLoaded(true));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const queryTooShort = query.trim().length < 3;

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (queryTooShort) return;

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, queryTooShort]);

  const visibleResults = queryTooShort ? [] : results;

  const selectResult = (result: GeocodeResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.easeTo({ center: [lng, lat], zoom: 16, duration: 400 });
    onChangeRef.current({ lat, lng, address: result.display_name });
    setQuery(result.display_name);
    setShowResults(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await movePinRef.current(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-soft)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search for an address or landmark…"
            className="field-input pl-9"
          />
          {showResults && (searching || visibleResults.length > 0) && (
            <div className="card-elevated absolute inset-x-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto p-1.5">
              {searching && <p className="px-3 py-2 text-xs text-[color:var(--muted)]">Searching…</p>}
              {!searching &&
                visibleResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => selectResult(result)}
                    className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm text-[color:var(--foreground)] transition-colors hover:bg-[rgba(234,108,29,0.08)]"
                  >
                    <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--accent)]" />
                    <span>{result.display_name}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
        <button type="button" onClick={useMyLocation} disabled={locating} className="btn-secondary whitespace-nowrap">
          <CrosshairIcon className="h-4 w-4" />
          {locating ? "Locating…" : "My location"}
        </button>
      </div>
      <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-[rgba(43,22,8,0.12)]">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color:var(--cream-200)] text-sm text-[color:var(--muted)]">
            Loading map…
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" onClick={() => setShowResults(false)} />
      </div>
      <p className="text-xs text-[color:var(--muted-soft)]">
        Drag the pin, click the map, or search above to set the exact location.
      </p>
    </div>
  );
}
