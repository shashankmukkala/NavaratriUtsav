import { NextRequest, NextResponse } from "next/server";

// Rough Telangana/Andhra Pradesh bounding box — the only states this app
// actually serves. A VPN puts the resolved IP location wherever its exit
// node is, which could be a different country, or just a different Indian
// state with nothing to show here either. Anything outside this box is
// treated the same as "no location" rather than trusted, so the map just
// falls back to its existing Hyderabad default instead of flying somewhere
// irrelevant (or, worse, empty).
const TS_AP_BOUNDS = { latMin: 12.5, latMax: 19.9, lngMin: 76.7, lngMax: 84.8 };

// Public: a coarse, IP-based location guess — purely to point the map's
// initial camera at roughly the right city (Khammam, Warangal, etc.) instead
// of always defaulting to Hyderabad, without asking for GPS permission.
// Vercel's edge network resolves this from the visitor's IP for free, no
// external API call needed — these headers just won't exist outside Vercel
// (e.g. local dev), which is why this always has a null fallback.
export async function GET(request: NextRequest) {
  const lat = Number(request.headers.get("x-vercel-ip-latitude"));
  const lng = Number(request.headers.get("x-vercel-ip-longitude"));
  const city = request.headers.get("x-vercel-ip-city");

  const isValid =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= TS_AP_BOUNDS.latMin &&
    lat <= TS_AP_BOUNDS.latMax &&
    lng >= TS_AP_BOUNDS.lngMin &&
    lng <= TS_AP_BOUNDS.lngMax;

  if (!isValid) {
    return NextResponse.json({ location: null });
  }

  return NextResponse.json({
    location: { lat, lng, city: city ? decodeURIComponent(city) : null },
  });
}
