import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public: approved, not-yet-expired sponsor banners (each payment covers 2
// days of display from approval). Pass pandal_id to get the banners tied to
// that pandal's detail page; omit it to get the general map-wide ads
// (pandal_id IS NULL) shown in the map's sponsored ad slots.
export async function GET(request: NextRequest) {
  const pandalId = request.nextUrl.searchParams.get("pandal_id");

  let query = supabaseAdmin()
    .from("sponsors")
    .select("*")
    .eq("status", "approved")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  query = pandalId ? query.eq("pandal_id", pandalId) : query.is("pandal_id", null);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sponsors: data });
}

// Public: anyone can submit a sponsor banner enquiry with payment proof. It
// starts as "pending" and only appears once an admin verifies payment and
// approves it in /admin. pandal_id is optional — sponsors are ads shown on
// the map screen itself, not tied to sponsoring a specific pandal.
export async function POST(request: NextRequest) {
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

  if (body.pandal_id) {
    const { data: pandal, error: pandalError } = await supabaseAdmin()
      .from("pandals")
      .select("id")
      .eq("id", body.pandal_id)
      .maybeSingle();

    if (pandalError) {
      return NextResponse.json({ error: pandalError.message }, { status: 500 });
    }
    if (!pandal) {
      return NextResponse.json({ error: "Pandal not found" }, { status: 404 });
    }
  }

  const { data, error } = await supabaseAdmin()
    .from("sponsors")
    .insert({
      pandal_id: body.pandal_id || null,
      sponsor_name: String(body.sponsor_name).slice(0, 200),
      contact_phone: String(body.contact_phone).slice(0, 30),
      banner_image_url: bannerUrls[0],
      banner_image_urls: bannerUrls,
      link_url: body.link_url ? String(body.link_url) : null,
      payment_proof_url: String(body.payment_proof_url),
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sponsor: data }, { status: 201 });
}
