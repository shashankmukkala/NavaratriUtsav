import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Admin: registered-user and site-visit counts. Cheap counting queries
// (head: true means Postgres doesn't actually return any rows, just the
// count) rather than pulling every row down to count client-side.
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [users, totalViews, views24h, views7d, uniqueVisitors] = await Promise.all([
    supabaseAdmin().from("users").select("id", { count: "exact", head: true }),
    supabaseAdmin().from("page_views").select("id", { count: "exact", head: true }),
    supabaseAdmin().from("page_views").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    supabaseAdmin().from("page_views").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    // Row counts above are raw hits (a page.count() on "id" can't dedupe),
    // so unique visitors goes through a count(distinct visitor_id) SQL
    // function instead — see migration 0013.
    supabaseAdmin().rpc("count_unique_visitors"),
  ]);

  return NextResponse.json({
    users: users.count ?? 0,
    totalViews: totalViews.count ?? 0,
    views24h: views24h.count ?? 0,
    views7d: views7d.count ?? 0,
    uniqueVisitors: uniqueVisitors.data ?? 0,
  });
}
