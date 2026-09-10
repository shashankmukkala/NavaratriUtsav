import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public: total visit count (every page load, not deduped), for the small
// "N visited" badge on the map — no auth needed, unlike /api/admin/analytics,
// since this one is meant to be shown to every visitor, not just admin.
export async function GET() {
  const { count, error } = await supabaseAdmin().from("page_views").select("id", { count: "exact", head: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ count: count ?? 0 });
}
