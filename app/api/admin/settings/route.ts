import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Admin: read the current UPI ID / QR code (same row the public route reads).
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("payment_settings")
    .select("upi_id, qr_image_url")
    .eq("id", true)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

// Admin: update the UPI ID and/or QR code image shown across the app.
export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const update: { upi_id?: string; qr_image_url?: string | null } = {};
  if (typeof body?.upi_id === "string" && body.upi_id.trim()) {
    update.upi_id = body.upi_id.trim().slice(0, 100);
  }
  if (body?.qr_image_url !== undefined) {
    update.qr_image_url = body.qr_image_url ? String(body.qr_image_url) : null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("payment_settings")
    .update(update)
    .eq("id", true)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}
