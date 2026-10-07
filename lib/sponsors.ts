import type { Sponsor } from "@/lib/types";

/** A sponsor's banner images — the multi-image list when present, else the
 * single legacy banner_image_url. */
export function sponsorImages(sponsor: Pick<Sponsor, "banner_image_url" | "banner_image_urls">): string[] {
  if (sponsor.banner_image_urls && sponsor.banner_image_urls.length > 0) return sponsor.banner_image_urls;
  return sponsor.banner_image_url ? [sponsor.banner_image_url] : [];
}
