import { NextRequest, NextResponse } from "next/server";

// Proxied server-side for the same reason as /api/geocode: a free, keyless
// routing engine (OSRM's public demo server), fine for the occasional
// "how far is this pandal" lookup this app makes, not for heavy traffic.
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

// Public: given the browser's own geolocation and a pandal's coordinates,
// returns real driving distance/duration (not just straight-line) so people
// can see "how far, how long" before tapping through to Google Maps.
export async function GET(request: NextRequest) {
  const fromLat = request.nextUrl.searchParams.get("from_lat");
  const fromLng = request.nextUrl.searchParams.get("from_lng");
  const toLat = request.nextUrl.searchParams.get("to_lat");
  const toLng = request.nextUrl.searchParams.get("to_lng");

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const url = `${OSRM_URL}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return NextResponse.json({ error: `Routing service returned ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }
    return NextResponse.json({ distanceKm: route.distance / 1000, durationMin: route.duration / 60 });
  } catch {
    return NextResponse.json({ error: "Routing service unreachable" }, { status: 502 });
  }
}
