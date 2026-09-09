import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import type { Database } from "@/lib/database.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PandalUpdate = Database["public"]["Tables"]["pandals"]["Update"];

async function requireOwner(request: NextRequest, id: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };

  const { data: pandal, error } = await supabaseAdmin()
    .from("pandals")
    .select("user_id, edit_unlocked")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!pandal) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (pandal.user_id !== userId) return { error: NextResponse.json({ error: "Not your listing" }, { status: 403 }) };

  return { userId, editUnlocked: pandal.edit_unlocked };
}

// Owner-only. Two independent things can be updated here:
//
// - The banner add-on (banner_image_urls / banner_payment_proof_url) is
//   always updatable — it's a self-contained paid extra, gated by an admin
//   confirming payment (banner_paid), not by edit approval.
// - Core listing details (name, address, timing, etc.) require edit_unlocked
//   to already be true — set only by an admin approving a request made via
//   POST .../request-edit. A successful core edit consumes that approval
//   (resets edit_unlocked/edit_requested) and sends the listing back to
//   "pending", since the new details haven't been checked yet.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner(request, id);
  if (owner.error) return owner.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: PandalUpdate = {};

  if (body.banner_image_urls !== undefined) {
    update.banner_image_urls = Array.isArray(body.banner_image_urls) ? body.banner_image_urls.map(String) : null;
  }
  if (body.banner_payment_proof_url !== undefined) {
    update.banner_payment_proof_url = body.banner_payment_proof_url ? String(body.banner_payment_proof_url) : null;
  }

  const stringFields = ["name", "organizer_name", "contact_phone", "address", "event_date", "timing_text", "image_url"] as const;
  const wantsCoreEdit =
    stringFields.some((field) => body[field] !== undefined) ||
    body.description !== undefined ||
    (body.lat !== undefined && body.lng !== undefined);

  if (wantsCoreEdit) {
    if (!owner.editUnlocked) {
      return NextResponse.json(
        { error: "Editing these details needs admin approval first — request edit access from your profile." },
        { status: 403 }
      );
    }
    for (const field of stringFields) {
      if (body[field] !== undefined) update[field] = String(body[field]).slice(0, field === "address" ? 500 : 200);
    }
    if (body.description !== undefined) {
      update.description = body.description ? String(body.description).slice(0, 2000) : null;
    }
    if (body.lat !== undefined && body.lng !== undefined) {
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
      }
      update.lat = lat;
      update.lng = lng;
    }
    update.status = "pending";
    update.edit_unlocked = false;
    update.edit_requested = false;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin().from("pandals").update(update).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pandal: data });
}

// Owner-only: permanently remove their own mandapam listing.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner(request, id);
  if (owner.error) return owner.error;

  const { error } = await supabaseAdmin().from("pandals").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
