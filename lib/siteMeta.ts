// Shared between the root layout's default metadata and any page-level
// generateMetadata (e.g. /map) — Next.js does NOT deep-merge the openGraph/
// twitter objects between a page and its parent layout, so a page that sets
// its own openGraph must repeat fields like `images` itself or they'll
// silently disappear from the preview instead of falling back.
export const SITE_URL = process.env.NEXTAUTH_URL || "https://bappa-seva.vercel.app";
export const SITE_TITLE = "BappaSeva";
export const SITE_DESCRIPTION = "Find the best mandapams and annadhanams being served around you this Ganesh Chaturthi.";
export const DEFAULT_OG_IMAGE = "/images/new_mandap.png";
