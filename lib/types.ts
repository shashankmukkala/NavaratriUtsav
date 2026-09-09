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
  timing_text: string | null; // free-form, e.g. "12:00 PM – 3:00 PM (till food lasts)"
  description: string | null;
  image_url: string;
  banner_image_urls: string[] | null;
  banner_payment_proof_url: string | null;
  banner_paid: boolean;
  user_id: string | null;
  status: PandalStatus;
  /** A short note from admin to the owner — why a listing was rejected,
   * etc. Shown on the owner's profile until they dismiss it. */
  admin_note: string | null;
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
  user_id: string | null;
  /** "map" = map-wide sponsored slots. "card" = shown generically inside
   * mandapam detail cards, not targeted at any one specific mandapam. */
  placement: "map" | "card";
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
}

/** A single result from /api/geocode (proxying Nominatim / OpenStreetMap). */
export interface GeocodeResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: { state?: string };
}
