export type PandalStatus = "pending" | "approved" | "rejected";

export interface Pandal {
  id: string;
  name: string;
  organizer_name: string;
  contact_phone: string;
  address: string;
  lat: number;
  lng: number;
  /** ISO date, e.g. "2026-09-14" — when this mandapam serves annadhanam, if
   * it does. Optional: null means it's a mandapam listing with no food
   * service date, so it shows under "Mandapams" instead of "Annadhanams". */
  event_date: string | null;
  /** ISO date, inclusive — when set, annadhanam runs every day from
   * event_date through this date (e.g. "every day till the last day of
   * the festival") instead of just a single day. Null means one day only. */
  event_date_end: string | null;
  timing_text: string | null; // free-form, e.g. "12:00 PM – 3:00 PM (till food lasts)"
  /** ISO date — when the idol is immersed (visarjan/nimajjanam). Separate
   * from event_date since the immersion day doesn't have to match when
   * annadhanam is served. Optional. */
  nimajjanam_date: string | null;
  description: string | null;
  image_url: string;
  /** ~160px version of image_url, for spots that only need a tiny
   * thumbnail (map markers, list rows) — serving the full photo there was
   * the single biggest driver of cached-egress usage, since every pandal's
   * full image loaded on every map view just to render a ~30px circle.
   * Null for photos uploaded before this existed; falls back to image_url. */
  thumbnail_url: string | null;
  source_image_url: string | null;
  banner_image_urls: string[] | null;
  banner_payment_proof_url: string | null;
  banner_paid: boolean;
  user_id: string | null;
  status: PandalStatus;
  /** A short note from admin to the owner — why a listing was rejected,
   * etc. Shown on the owner's profile until they dismiss it. */
  admin_note: string | null;
  /** Glowing/pulsing highlight on the map pin + a badge on its card — either
   * an admin-picked milestone (e.g. a 114th year of celebrations) or a paid
   * ₹99 self-serve highlight approved from star_payment_proof_url below.
   * Both use the same flag; there's no need to distinguish the reason. */
  featured: boolean;
  /** The badge's own text when featured (e.g. "114th Year"). Kept separate
   * from `featured` so turning the highlight off doesn't lose what was typed.
   * Left blank for a plain paid star with no specific milestone to name. */
  milestone_text: string | null;
  /** Set once the owner submits proof of paying for the star highlight —
   * same review pattern as banner_payment_proof_url: admin checks it, then
   * approves by setting featured to true. */
  star_payment_proof_url: string | null;
  /** Up to 3 more photos alongside image_url (the cover photo) — max 4
   * total. Null/empty means just the one cover photo, same as before this
   * existed. */
  extra_image_urls: string[] | null;
  created_at: string;
}

export interface Sponsor {
  id: string;
  pandal_id: string | null;
  sponsor_name: string;
  contact_phone: string;
  banner_image_url: string | null;
  banner_image_urls: string[] | null;
  link_url: string | null;
  payment_proof_url: string;
  status: PandalStatus;
  expires_at: string | null;
  /** Admin-set — when this ad should start showing. Null means "immediately
   * on approval" (the original behavior); a future date schedules it to
   * start then instead (e.g. day 4 of the festival), with its 2-day
   * display window counted from that date, not from approval time. */
  starts_at: string | null;
  user_id: string | null;
  /** "map" = map-wide sponsored slots. "card" = shown generically inside
   * mandapam detail cards, not targeted at any one specific mandapam.
   * "crow" = the premium animated crow-towed-banner placement. */
  placement: "map" | "card" | "crow";
  /** Which flying object carries the banner — only meaningful when
   * placement is "crow". Sponsors never pick this; admin sets it per ad
   * when approving, so a movie-promo ad can get a rocket while another
   * gets a crow. */
  vehicle: "crow" | "rocket" | "phoenix";
  /** Owner has asked to edit this already-submitted ad's details. */
  edit_requested: boolean;
  /** Admin has approved that request — the owner can now save one edit
   * before this resets and a new request is needed. */
  edit_unlocked: boolean;
  created_at: string;
}

/** The single shared UPI ID / QR code shown wherever the app asks people to
 * pay (submit's banner add-on, sponsor ads) — admin-editable from /admin. */
export interface PaymentSettings {
  upi_id: string;
  qr_image_url: string | null;
  map_ad_price: number;
  card_ad_price: number;
  banner_price: number;
  star_price: number;
  crow_ad_price: number;
  /** How often (in seconds) the crow ad makes a pass across the map. */
  crow_interval_seconds: number;
}

/** A single result from /api/geocode (proxying Nominatim / OpenStreetMap). */
export interface GeocodeResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: { state?: string };
}
