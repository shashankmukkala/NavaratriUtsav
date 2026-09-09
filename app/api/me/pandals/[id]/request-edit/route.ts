import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Owner-only: flags a listing for admin review before its core details can
// be edited, instead of letting an already-approved listing be silently
// rewritten. Approving/denying happens from /admin.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: pandal, error: fetchError } = await supabaseAdmin()
    .from("pandals")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!pandal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pandal.user_id !== userId) return NextResponse.json({ error: "Not your listing" }, { status: 403 });

  const { data, error } = await supabaseAdmin()
    .from("pandals")
    .update({ edit_requested: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pandal: data });
}
