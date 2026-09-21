import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin, UPLOADS_BUCKET } from "@/lib/supabaseAdmin";

// Map markers and list-row thumbnails only ever render a pandal's photo at
// a few dozen pixels — this is the size that actually gets fetched on
// every map view, so keeping it tiny is what controls cached-egress cost,
// not the full photo's size.
const THUMBNAIL_WIDTH = 160;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

// Public endpoint: anyone submitting a pandal or sponsor needs to upload a
// photo before they have anything else to authenticate with, so this route
// is intentionally open for those folders. "settings" (the site's QR code)
// is admin-only, checked below, since it's edited from /admin not a public form.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const folder = formData.get("folder");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof folder !== "string" || !["pandals", "sponsors", "payment-proofs", "settings"].includes(folder)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }
  if (folder === "settings" && !requireAdmin(request)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP, or GIF images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin()
    .storage.from(UPLOADS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin().storage.from(UPLOADS_BUCKET).getPublicUrl(path);

  // Only pandal photos get shown as tiny map/list thumbnails elsewhere —
  // sponsor banners, payment proofs, and settings images are always shown
  // at a real size, so a second small copy would just be wasted storage.
  let thumbnailUrl: string | null = null;
  if (folder === "pandals") {
    try {
      const thumbBuffer = await sharp(bytes).resize(THUMBNAIL_WIDTH).jpeg({ quality: 80 }).toBuffer();
      const thumbPath = `${folder}/thumbs/${randomUUID()}.jpg`;
      const { error: thumbError } = await supabaseAdmin()
        .storage.from(UPLOADS_BUCKET)
        .upload(thumbPath, thumbBuffer, { contentType: "image/jpeg", upsert: false });
      if (!thumbError) {
        thumbnailUrl = supabaseAdmin().storage.from(UPLOADS_BUCKET).getPublicUrl(thumbPath).data.publicUrl;
      }
    } catch {
      // A thumbnail failure shouldn't block the actual upload — every
      // display spot already falls back to the full image_url when
      // thumbnail_url is null.
    }
  }

  return NextResponse.json({ url: data.publicUrl, thumbnail_url: thumbnailUrl });
}
