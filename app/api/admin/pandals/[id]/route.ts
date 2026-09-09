import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["pending", "approved", "rejected"];

// Admin: approve, reject, or later unpublish (set back to pending/rejected) a pandal.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;
  const bannerPaid = body?.banner_paid;
  const editUnlocked = body?.edit_unlocked;
  const adminNote = body?.admin_note;

  const update: {
    status?: "pending" | "approved" | "rejected";
    banner_paid?: boolean;
    edit_unlocked?: boolean;
    edit_requested?: boolean;
    admin_note?: string | null;
  } = {};
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = status;
  }
  if (bannerPaid !== undefined) {
    update.banner_paid = Boolean(bannerPaid);
  }
  if (editUnlocked !== undefined) {
    // Approving or denying resolves the request either way — an admin who
    // just said no shouldn't leave it sitting there looking unanswered.
    update.edit_unlocked = Boolean(editUnlocked);
    update.edit_requested = false;
  }
  if (adminNote !== undefined) {
    update.admin_note = adminNote ? String(adminNote).slice(0, 500) : null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("pandals")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pandal: data });
}

// Admin: permanently remove a pandal (and its sponsor banners, via cascade).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin().from("pandals").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
