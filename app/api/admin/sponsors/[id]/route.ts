import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["pending", "approved", "rejected"];

// Admin: approve a sponsor banner after verifying the payment proof, or reject it.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;
  const editUnlocked = body?.edit_unlocked;

  const update: { status?: "pending" | "approved" | "rejected"; expires_at?: string | null; edit_unlocked?: boolean; edit_requested?: boolean } = {};

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = status;
    // Each payment covers 2 days of display, starting from approval — not
    // from submission, so a slow review doesn't eat into the advertiser's time.
    update.expires_at = status === "approved" ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() : null;
  }
  if (editUnlocked !== undefined) {
    // Approving or denying resolves the request either way — an admin who
    // just said no shouldn't leave it sitting there looking unanswered.
    update.edit_unlocked = Boolean(editUnlocked);
    update.edit_requested = false;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
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
