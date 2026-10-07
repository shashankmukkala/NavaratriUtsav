// Shared between the root layout's default metadata and any page-level
// generateMetadata (e.g. /map) — Next.js does NOT deep-merge the openGraph/
// twitter objects between a page and its parent layout, so a page that sets
// its own openGraph must repeat fields like `images` itself or they'll
// silently disappear from the preview instead of falling back.
export const SITE_URL = process.env.NEXTAUTH_URL || "https://bappa-seva.vercel.app";
export const SITE_TITLE = "Navaratri Utsav";
export const SITE_DESCRIPTION =
  "Discover Durga Maa pandals, dandiya nights and cultural celebrations happening near you this Navaratri.";
export const DEFAULT_OG_IMAGE = "/images/utsav-hero.webp";

/** Sharad Navaratri 2026 — shown on the homepage and used as the default
 * date range when adding a celebration. ISO dates, inclusive. */
export const FESTIVAL_START = "2026-10-11";
export const FESTIVAL_END = "2026-10-20";
export const FESTIVAL_LABEL = "11 Oct – 20 Oct, 2026";

/** Shown only if the admin-set UPI ID hasn't loaded — never a real payee. */
export const UPI_FALLBACK = "UPI ID not set";
