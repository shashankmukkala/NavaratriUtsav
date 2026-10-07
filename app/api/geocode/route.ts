import { NextRequest, NextResponse } from "next/server";

// Proxied server-side per Nominatim's usage policy
// (nominatim.org/release-docs/latest/api/Search/), which requires a valid
// identifying User-Agent — a bare browser fetch from the client is easy to
// rate-limit/block and silently returns nothing.
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "NavaratriUtsav/1.0 (contact via repo issues)";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");
  if (lat && lon) return reverseGeocode(lat, lon);

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json([]);
  }

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  // Biased toward India (where these festival listings are) without
  // hard-restricting results the way the reference project's Hyderabad-only
  // viewbox does — a pandal could be pinned anywhere in the country.
  url.searchParams.set("countrycodes", "in");
  // Needed so callers can tell which state a result is in — the app is
  // currently only serving Telangana and Andhra Pradesh.
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Geocoding service unreachable" }, { status: 502 });
  }
}

// Turns a lat/lng someone dragged the pin to (or clicked) into a real,
// human-readable address, so the submit form shows *where that actually is*
// instead of a bare pair of coordinates.
async function reverseGeocode(lat: string, lon: string) {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Geocoding service unreachable" }, { status: 502 });
  }
}
