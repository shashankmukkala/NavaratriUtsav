import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Owner-only: permanently remove their own ad.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const { data: sponsor, error: fetchError } = await supabaseAdmin()
    .from("sponsors")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!sponsor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (sponsor.user_id !== userId) {
    return NextResponse.json({ error: "Not your ad" }, { status: 403 });
  }

  const { error } = await supabaseAdmin().from("sponsors").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
