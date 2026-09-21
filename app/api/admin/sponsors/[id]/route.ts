import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["pending", "approved", "rejected"];
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// Admin: approve/reject a sponsor ad, unlock the owner's edit request, edit
// its content directly (sponsor name/phone/link/banner images — useful when
// someone sends their redirect link after already paying), or schedule it
// to start showing on a specific future day instead of immediately.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: {
    sponsor_name?: string;
    contact_phone?: string;
    link_url?: string | null;
    banner_image_urls?: string[];
    banner_image_url?: string | null;
    starts_at?: string | null;
    status?: "pending" | "approved" | "rejected";
    edit_unlocked?: boolean;
    edit_requested?: boolean;
    expires_at?: string | null;
    vehicle?: "crow" | "rocket";
  } = {};

  if (body.vehicle === "crow" || body.vehicle === "rocket") update.vehicle = body.vehicle;
  if (body.sponsor_name !== undefined) update.sponsor_name = String(body.sponsor_name).slice(0, 200);
  if (body.contact_phone !== undefined) update.contact_phone = String(body.contact_phone).slice(0, 30);
  if (body.link_url !== undefined) update.link_url = body.link_url ? String(body.link_url) : null;
  if (Array.isArray(body.banner_image_urls)) {
    const urls = body.banner_image_urls.filter((u: unknown): u is string => typeof u === "string" && u.length > 0).slice(0, 3);
    update.banner_image_urls = urls;
    update.banner_image_url = urls[0] ?? null;
  }

  const touchesStartsAt = body.starts_at !== undefined;
  if (touchesStartsAt) {
    update.starts_at = body.starts_at ? new Date(body.starts_at).toISOString() : null;
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.edit_unlocked !== undefined) {
    // Approving or denying resolves the request either way — an admin who
    // just said no shouldn't leave it sitting there looking unanswered.
    update.edit_unlocked = Boolean(body.edit_unlocked);
    update.edit_requested = false;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // expires_at always covers exactly 2 days of display from whenever the ad
  // actually starts showing — from a scheduled starts_at if one is set and
  // still in the future, otherwise from right now. Only recomputed when
  // something that affects it (status -> approved, or starts_at on an
  // already-approved ad) is actually part of this request, so an unrelated
  // edit (e.g. just the link_url) doesn't silently reset an already-running
  // ad's expiry.
  if (update.status !== undefined && update.status !== "approved") {
    update.expires_at = null;
  } else if (update.status === "approved" || touchesStartsAt) {
    let currentStatus = update.status as string | undefined;
    let currentStartsAt = touchesStartsAt ? (update.starts_at as string | null) : undefined;
    if (currentStatus === undefined || currentStartsAt === undefined) {
      const { data: existing } = await supabaseAdmin().from("sponsors").select("status, starts_at").eq("id", id).single();
      currentStatus = currentStatus ?? existing?.status;
      currentStartsAt = currentStartsAt ?? existing?.starts_at ?? null;
    }
    if (currentStatus === "approved") {
      const base = currentStartsAt && new Date(currentStartsAt).getTime() > Date.now() ? new Date(currentStartsAt) : new Date();
      update.expires_at = new Date(base.getTime() + TWO_DAYS_MS).toISOString();
    }
  }

  const { data, error } = await supabaseAdmin().from("sponsors").update(update).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sponsor: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin().from("sponsors").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
