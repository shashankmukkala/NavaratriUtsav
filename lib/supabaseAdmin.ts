import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Server-only client. Uses the service-role key, which bypasses row level
// security, so every read/write in this app is mediated by an API route
// rather than by client-side Supabase calls. Never import this file from a
// "use client" component.
let cached: SupabaseClient<Database> | null = null;

export function supabaseAdmin() {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local (see README)."
    );
  }

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cached;
}

export const UPLOADS_BUCKET = "uploads";
