import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public: only approved pandals are visible on the map.
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("pandals")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pandals: data });
}

const REQUIRED_FIELDS = ["name", "organizer_name", "contact_phone", "address", "lat", "lng", "image_url"] as const;

// Requires a signed-in Google account, so a submission can be tagged with
// who made it (for later editing) — see lib/authOptions.ts. It always starts
// as "pending" and only becomes visible after an admin approves it in /admin.
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

  for (const field of REQUIRED_FIELDS) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("pandals")
    .insert({
      name: String(body.name).slice(0, 200),
      organizer_name: String(body.organizer_name).slice(0, 200),
      contact_phone: String(body.contact_phone).slice(0, 30),
      address: String(body.address).slice(0, 500),
      lat,
      lng,
      event_date: body.event_date ? String(body.event_date) : null,
      timing_text: body.timing_text ? String(body.timing_text).slice(0, 200) : null,
      description: body.description ? String(body.description).slice(0, 2000) : null,
      image_url: String(body.image_url),
      banner_image_urls: Array.isArray(body.banner_image_urls)
        ? body.banner_image_urls.filter((u: unknown) => typeof u === "string").slice(0, 2)
        : null,
      banner_payment_proof_url: body.banner_payment_proof_url ? String(body.banner_payment_proof_url) : null,
      user_id: userId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pandal: data }, { status: 201 });
}
