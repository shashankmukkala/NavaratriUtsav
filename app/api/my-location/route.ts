import { NextRequest, NextResponse } from "next/server";

// Public: a coarse, IP-based location guess — purely to point the map's
// initial camera at roughly the right city (Khammam, Warangal, etc.) instead
// of always defaulting to Hyderabad, without asking for GPS permission.
// Vercel's edge network resolves this from the visitor's IP for free, no
// external API call needed — these headers just won't exist outside Vercel
// (e.g. local dev), which is why this always has a null fallback.
export async function GET(request: NextRequest) {
  const lat = request.headers.get("x-vercel-ip-latitude");
  const lng = request.headers.get("x-vercel-ip-longitude");
  const city = request.headers.get("x-vercel-ip-city");

  if (!lat || !lng) {
    return NextResponse.json({ location: null });
  }

  return NextResponse.json({
    location: { lat: Number(lat), lng: Number(lng), city: city ? decodeURIComponent(city) : null },
  });
}
