import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  return NextResponse.json({ loggedIn: requireAdmin(request) });
}
