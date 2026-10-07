import { NextRequest, NextResponse } from "next/server";
import { publicCache } from "@/lib/cacheHeaders";
import { NOMINATIM_SEARCH_URL, NOMINATIM_USER_AGENT } from "@/lib/nominatim";

// Lets someone paste a Google Maps link (or a bare "lat, lng") instead of
// having to precisely drag a pin or trust a text search — Google Maps
// itself is generally far more accurate for finding a specific real-world
// place in India than searching Nominatim by name, and "share the link"
// is already a habit most people have. We only ever extract coordinates
// here; the actual address text still comes from our own reverse-geocode
// of those coordinates, so it stays consistent with everywhere else.

// A shared "place" link often carries the pin's exact coordinates in a
// `!3d<lat>!4d<lng>` pair, which is more precise than the `@lat,lng,zoom`
// viewport-center segment every Maps URL also has — so it's checked first.
const PLACE_PIN = /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/;
const VIEWPORT_CENTER = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/;
const QUERY_PARAM = /[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/;
const BARE_COORDS = /^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/;
// Newer share links resolve to a `?q=<place name>&ftid=...` URL with no
// coordinates anywhere on the page at all — the address text is all we get,
// so it's geocoded the same way a manually typed search would be.
const QUERY_TEXT_PARAM = /[?&]q=([^&]+)/;

function extractCoords(text: string): { lat: number; lng: number } | null {
  const place = text.match(PLACE_PIN);
  if (place) return { lat: Number(place[1]), lng: Number(place[2]) };
  const viewport = text.match(VIEWPORT_CENTER);
  if (viewport) return { lat: Number(viewport[1]), lng: Number(viewport[2]) };
  const query = text.match(QUERY_PARAM);
  if (query) return { lat: Number(query[1]), lng: Number(query[2]) };
  return null;
}

// The same link always resolves to the same place — cache successes for a day.
const RESOLVED_CACHE = publicCache(86_400, 604_800);

async function searchNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");

  try {
    const res = await fetch(url.toString(), { headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
  } catch {
    return null;
  }
}

async function geocodeAddressFromUrl(finalUrl: string): Promise<{ lat: number; lng: number } | null> {
  const match = finalUrl.match(QUERY_TEXT_PARAM);
  if (!match) return null;
  const query = decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
  if (!query || /^-?\d{1,2}\.\d+,-?\d{1,3}\.\d+$/.test(query)) return null;

  const exact = await searchNominatim(query);
  if (exact) return exact;

  // Place links often lead with a shop/building name Nominatim doesn't
  // index ("Shop no. 11, Nampally Ka Maharaja, ...") — drop leading
  // comma-separated segments one at a time until something matches, but
  // keep at least the last two (locality + city/state) so the result
  // doesn't collapse into an entire city.
  const parts = query.split(",").map((p) => p.trim()).filter(Boolean);
  for (let start = 1; start <= parts.length - 2; start++) {
    const trimmed = parts.slice(start).join(", ");
    const hit = await searchNominatim(trimmed);
    if (hit) return hit;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.trim();
  if (!input) {
    return NextResponse.json({ error: "Paste a Google Maps link or \"lat, lng\"" }, { status: 400 });
  }

  const bare = input.match(BARE_COORDS);
  if (bare) {
    const lat = Number(bare[1]);
    const lng = Number(bare[2]);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "That doesn't look like a valid coordinate." }, { status: 400 });
    }
    return NextResponse.json({ lat, lng }, { headers: RESOLVED_CACHE });
  }

  if (!/^https?:\/\//i.test(input)) {
    return NextResponse.json({ error: "Paste a Google Maps link or \"lat, lng\"" }, { status: 400 });
  }

  // Shortened links (maps.app.goo.gl, goo.gl/maps) don't carry coordinates
  // themselves — following the redirect server-side (a plain client fetch
  // would be blocked by CORS) resolves them to the full URL that does.
  try {
    const res = await fetch(input, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NavaratriUtsav/1.0)" },
    });
    const finalUrl = res.url || input;
    const fromUrl = extractCoords(decodeURIComponent(finalUrl));
    if (fromUrl) return NextResponse.json(fromUrl, { headers: RESOLVED_CACHE });

    // Some place links only embed coordinates in the page body, not the URL.
    const body = await res.text();
    const fromBody = extractCoords(body);
    if (fromBody) return NextResponse.json(fromBody, { headers: RESOLVED_CACHE });

    // Newer links carry only a place name/address — geocode that text instead.
    const fromAddress = await geocodeAddressFromUrl(finalUrl);
    if (fromAddress) return NextResponse.json(fromAddress, { headers: RESOLVED_CACHE });

    return NextResponse.json({ error: "Couldn't find a location in that link." }, { status: 422 });
  } catch {
    return NextResponse.json({ error: "Couldn't open that link — check it and try again." }, { status: 502 });
  }
}
