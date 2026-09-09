"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/mapWorker";
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, OPENFREEMAP_STYLE_URL } from "@/lib/mapStyle";
import { setMirrorSource } from "@/lib/mapMirror";
import type { Pandal } from "@/lib/types";

interface MapViewProps {
  pandals: Pandal[];
  selectedId: string | null;
  onSelect: (pandal: Pandal) => void;
  /** Camera target independent of any pin — the user's own location once
   * fetched, or a searched area once geocoded. */
  flyTo?: { lat: number; lng: number } | null;
}

export default function MapView({ pandals, selectedId, onSelect, flyTo }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, { marker: Marker; el: HTMLButtonElement }>>(new globalThis.Map());
  const onSelectRef = useRef(onSelect);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      // Needed so GlassBlurLayer can drawImage() from this canvas — without
      // it the GL buffer is cleared right after compositing and reads back
      // blank. (backdrop-filter can't sample this canvas at all in this
      // app's target browsers — see globals.css — so the glass panels mirror
      // these pixels into their own canvas and blur that directly instead.)
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => setLoaded(true));
    map.on("error", () => setErrored(true));
    setMirrorSource(map.getCanvas());

    return () => {
      setMirrorSource(null);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const existing = markersRef.current;
    const nextIds = new Set(pandals.map((p) => p.id));

    for (const [id, entry] of existing) {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        existing.delete(id);
      }
    }

    for (const pandal of pandals) {
      if (existing.has(pandal.id)) continue;

      const el = document.createElement("button");
      el.type = "button";
      el.className = "map-pin";
      el.setAttribute("aria-label", `Open ${pandal.name}`);

      const icon = document.createElement("span");
      icon.className = "map-pin-icon";
      const img = document.createElement("img");
      img.src = pandal.image_url;
      img.alt = "";
      icon.appendChild(img);

      const label = document.createElement("span");
      label.className = "map-pin-label";
      label.textContent = pandal.name;

      el.append(icon, label);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(pandal);
      });

      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([pandal.lng, pandal.lat])
        .addTo(map);

      existing.set(pandal.id, { marker, el });
    }
  }, [loaded, pandals]);

  // Toggle the selected pin's styling (filled saffron pill + visible name)
  // without rebuilding markers.
  useEffect(() => {
    for (const [id, entry] of markersRef.current) {
      entry.el.classList.toggle("map-pin-selected", id === selectedId);
    }
  }, [selectedId, pandals]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !selectedId) return;
    const entry = markersRef.current.get(selectedId);
    if (entry) {
      map.easeTo({ center: entry.marker.getLngLat(), zoom: Math.max(map.getZoom(), 14), duration: 400 });
    }
  }, [loaded, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !flyTo) return;
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: Math.max(map.getZoom(), 12), duration: 1000 });
  }, [loaded, flyTo]);

  useEffect(() => {
    const existing = markersRef.current;
    return () => {
      for (const entry of existing.values()) entry.marker.remove();
      existing.clear();
    };
  }, []);

  if (errored) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[color:var(--cream-200)] p-6 text-center text-sm text-[color:var(--muted)]">
        Map tiles could not load. Check your internet connection and try again.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color:var(--cream-200)] text-sm text-[color:var(--muted)]">
          Loading map…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />

      {/* Map data credit — collapsed by default, expands to name the source
       * when tapped, instead of permanently occupying corner space. */}
      <div className="absolute bottom-2 left-2 z-10">
        {showAttribution ? (
          <button
            type="button"
            onClick={() => setShowAttribution(false)}
            className="rounded-full bg-white/85 px-2.5 py-1 text-[0.6875rem] text-[color:var(--muted)] shadow-sm backdrop-blur-sm"
          >
            © OpenStreetMap contributors · Tiles by OpenFreeMap
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowAttribution(true)}
            aria-label="Map data source"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/85 text-[0.6875rem] font-bold text-[color:var(--muted)] shadow-sm backdrop-blur-sm"
          >
            i
          </button>
        )}
      </div>
    </div>
  );
}
