import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

// Lets the admin crop tool read pixel data (via canvas) from a photo's
// original external source, which usually doesn't send CORS headers of its
// own — proxying it through our own origin sidesteps that instead of
// depending on a third party to cooperate.
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only https sources are allowed" }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch source image" }, { status: 502 });
  }
  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Source is not an image" }, { status: 400 });
  }

  return new NextResponse(upstream.body, { headers: { "Content-Type": contentType } });
}
