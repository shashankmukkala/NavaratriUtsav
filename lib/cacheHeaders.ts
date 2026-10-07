/** Cache-Control for public, non-personal GET endpoints. `s-maxage` lets the
 * CDN (Vercel's edge) serve one cached copy to every visitor for that long,
 * so Supabase is queried once per window instead of once per page view;
 * `stale-while-revalidate` keeps serving the last copy while it refreshes in
 * the background, so nobody waits on the database. */
export function publicCache(seconds: number, staleSeconds: number = seconds * 5): HeadersInit {
  return { "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}` };
}
