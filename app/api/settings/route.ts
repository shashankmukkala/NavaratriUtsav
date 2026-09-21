import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public: the UPI ID / QR code shown wherever the app asks people to pay.
// Admin-editable via /api/admin/settings, read-only here.
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("payment_settings")
    .select("upi_id, qr_image_url, map_ad_price, card_ad_price, banner_price, star_price, crow_ad_price, crow_interval_seconds")
    .eq("id", true)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}
