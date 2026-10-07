// This app currently only serves Navaratri celebrations in Telangana
// and Andhra Pradesh — Nominatim's `address.state` (English name) is
// checked against this list wherever a location resolves from a search or
// from the browser's GPS.
const SERVED_STATES = ["Telangana", "Andhra Pradesh"];

export function isServedState(state: string | undefined | null): boolean {
  if (!state) return true; // unknown state — don't block on missing data
  return SERVED_STATES.includes(state);
}
