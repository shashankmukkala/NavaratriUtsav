// Free, no-API-key map stack: MapLibre GL rendering OpenFreeMap's "liberty"
// vector style, which is light by default — no dark-theme recoloring needed
// here, unlike the reference project this pattern is borrowed from.
export const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Dark variant (currently unused — the homepage map uses the light style)
// for any future dark-background placement.
export const OPENFREEMAP_DARK_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

// Hyderabad, where the site launched — but pandals anywhere can be pinned,
// so there's no viewport lock like the reference project's Telangana bounds.
export const DEFAULT_MAP_CENTER: [number, number] = [78.4867, 17.385];
export const DEFAULT_ZOOM = 11;
