import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Lightweight check the profile nav link polls on every page: is there an
// admin note waiting on any of this user's mandapams? There's no email or
// push setup in this app, so an in-app badge visible from anywhere (not
// just after already opening /profile) is the actual notification.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ hasNote: false });
  }

  const { count, error } = await supabaseAdmin()
    .from("pandals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("admin_note", "is", null);

  if (error) {
    return NextResponse.json({ hasNote: false });
  }
  return NextResponse.json({ hasNote: (count ?? 0) > 0 });
}
