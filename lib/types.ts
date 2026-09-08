export type PandalStatus = "pending" | "approved" | "rejected";

export interface Pandal {
  id: string;
  name: string;
  organizer_name: string;
  contact_phone: string;
  address: string;
  lat: number;
  lng: number;
  event_date: string; // ISO date, e.g. "2026-09-14"
  timing_text: string; // free-form, e.g. "12:00 PM – 3:00 PM (till food lasts)"
  description: string | null;
  image_url: string;
  banner_image_urls: string[] | null;
  banner_payment_proof_url: string | null;
  banner_paid: boolean;
  user_id: string | null;
  status: PandalStatus;
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
}
