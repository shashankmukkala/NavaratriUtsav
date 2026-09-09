import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import type { Database } from "@/lib/database.types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SponsorUpdate = Database["public"]["Tables"]["sponsors"]["Update"];

async function requireOwner(request: NextRequest, id: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };

  const { data: sponsor, error } = await supabaseAdmin()
    .from("sponsors")
    .select("user_id, edit_unlocked")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!sponsor) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (sponsor.user_id !== userId) return { error: NextResponse.json({ error: "Not your ad" }, { status: 403 }) };

  return { userId, editUnlocked: sponsor.edit_unlocked };
}

// Owner-only: edit their own ad — unlike a mandapam listing, this needs
// admin approval first (POST .../request-edit), since an ad is something
// someone paid to run and its content shouldn't change unreviewed mid-flight.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner(request, id);
  if (owner.error) return owner.error;

  if (!owner.editUnlocked) {
    return NextResponse.json(
      { error: "Editing this ad needs admin approval first — request edit access from your profile." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: SponsorUpdate = {};
  if (body.sponsor_name !== undefined) update.sponsor_name = String(body.sponsor_name).slice(0, 200);
  if (body.contact_phone !== undefined) update.contact_phone = String(body.contact_phone).slice(0, 20);
  if (body.link_url !== undefined) update.link_url = body.link_url ? String(body.link_url).slice(0, 500) : null;
  if (body.banner_image_urls !== undefined) {
    update.banner_image_urls = Array.isArray(body.banner_image_urls) ? body.banner_image_urls.map(String) : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  update.status = "pending";
  update.edit_unlocked = false;
  update.edit_requested = false;

  const { data, error } = await supabaseAdmin().from("sponsors").update(update).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sponsor: data });
}

// Owner-only: permanently remove their own ad.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner(request, id);
  if (owner.error) return owner.error;

  const { error } = await supabaseAdmin().from("sponsors").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
