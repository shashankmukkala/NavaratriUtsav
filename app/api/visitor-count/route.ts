import { NextResponse } from "next/server";
import { publicCache } from "@/lib/cacheHeaders";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public: total visit count (every page load, not deduped), for the small
// "N visited" badge on the map — no auth needed, unlike /api/admin/analytics,
// since this one is meant to be shown to every visitor, not just admin.
export async function GET() {
  const { count, error } = await supabaseAdmin().from("page_views").select("id", { count: "exact", head: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // A full-table count is the most expensive query here — one shared copy
  // every 5 minutes is plenty for a showcase number.
  return NextResponse.json({ count: count ?? 0 }, { headers: publicCache(300) });
}
