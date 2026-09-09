import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Fired once per page load from components/Analytics.tsx (mounted in the
// root layout) — a plain visit counter, not tied to any user, so the admin
// dashboard can show how much traffic the site is actually getting.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.slice(0, 200) : "/";
  const visitorId = typeof body?.visitor_id === "string" ? body.visitor_id.slice(0, 100) : null;

  const { error } = await supabaseAdmin().from("page_views").insert({ path, visitor_id: visitorId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
