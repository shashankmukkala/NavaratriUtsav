import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public: just the unique-visitor count, for the small "N people have
// visited" badge on the map — no auth needed, unlike /api/admin/analytics,
// since this one is meant to be shown to every visitor, not just admin.
export async function GET() {
  const { data, error } = await supabaseAdmin().rpc("count_unique_visitors");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ count: data ?? 0 });
}
