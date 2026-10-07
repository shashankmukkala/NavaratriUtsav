import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { publicCache } from "@/lib/cacheHeaders";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public: approved, not-yet-expired sponsor banners (each payment covers 2
// days of display from approval). ?placement=card returns ads shown
// generically inside listing detail cards; ?placement=crow returns the
// animated flying-banner ads; anything else (the default) returns the
// map-wide sponsored slots.
export async function GET(request: NextRequest) {
  const placementParam = request.nextUrl.searchParams.get("placement");
  const placement = placementParam === "card" || placementParam === "crow" ? placementParam : "map";

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("sponsors")
    // Only what the public ad slots render — never contact phones or
    // payment-proof screenshots on this unauthenticated endpoint.
    .select("id, sponsor_name, banner_image_url, banner_image_urls, link_url, placement, vehicle")
    .eq("status", "approved")
    .eq("placement", placement)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    // Scheduled to start on a future day (starts_at) shouldn't show yet.
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sponsors: data }, { headers: publicCache(60) });
}

// Requires a signed-in Google account (see lib/authOptions.ts). Starts as
// "pending" and only appears once an admin verifies payment and approves it
// in /admin. placement picks the tier: "card" (shown generically inside
// listing detail cards) or "map" (the map-wide sponsored slots, default).
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required = ["sponsor_name", "contact_phone", "payment_proof_url"] as const;
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
  }

  const bannerUrls = Array.isArray(body.banner_image_urls)
    ? body.banner_image_urls.filter((u: unknown) => typeof u === "string" && u).slice(0, 3)
    : [];
  if (bannerUrls.length === 0) {
    return NextResponse.json({ error: "Missing field: banner_image_urls" }, { status: 400 });
  }

  const placement = body.placement === "card" ? "card" : body.placement === "crow" ? "crow" : "map";

  const { data, error } = await supabaseAdmin()
    .from("sponsors")
    .insert({
      sponsor_name: String(body.sponsor_name).slice(0, 200),
      contact_phone: String(body.contact_phone).slice(0, 30),
      banner_image_url: bannerUrls[0],
      banner_image_urls: bannerUrls,
      link_url: body.link_url ? String(body.link_url) : null,
      payment_proof_url: String(body.payment_proof_url),
      user_id: userId,
      placement,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sponsor: data }, { status: 201 });
}
