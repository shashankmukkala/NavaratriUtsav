import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_TITLE } from "@/lib/siteMeta";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import MapPageClient from "./MapPageClient";

// Server component wrapper purely so a shared /map?pandal=<id> link gets a
// proper per-listing preview (name, description, photo) when pasted into
// Instagram/WhatsApp/etc — the actual map UI is entirely client-side (see
// MapPageClient) and can't generate per-request metadata on its own.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ pandal?: string }>;
}): Promise<Metadata> {
  const fallback: Metadata = {
    title: SITE_TITLE,
    description: "Explore pandals, dandiya nights and cultural events near you this Navaratri.",
    openGraph: {
      title: SITE_TITLE,
      description: "Explore pandals, dandiya nights and cultural events near you this Navaratri.",
      images: [DEFAULT_OG_IMAGE],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: "Explore pandals, dandiya nights and cultural events near you this Navaratri.",
      images: [DEFAULT_OG_IMAGE],
    },
  };

  const { pandal: pandalId } = await searchParams;
  if (!pandalId) return fallback;

  const { data: pandal } = await supabaseAdmin()
    .from("pandals")
    .select("name, address, description, image_url")
    .eq("id", pandalId)
    .eq("status", "approved")
    .maybeSingle();

  if (!pandal) return fallback;

  // The browser tab always reads just the site name; the share preview
  // (openGraph/twitter) still names the specific listing.
  const title = `${pandal.name} — ${SITE_TITLE}`;
  const description = pandal.description?.trim() || `${pandal.name} — ${pandal.address}. Find directions, timings and more on ${SITE_TITLE}.`;

  return {
    title: SITE_TITLE,
    description,
    openGraph: { title, description, images: [pandal.image_url], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [pandal.image_url] },
  };
}

export default function MapPage() {
  return <MapPageClient />;
}
