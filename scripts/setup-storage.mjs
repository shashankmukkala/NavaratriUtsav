// Creates the public "uploads" storage bucket used for pandal photos, sponsor
// banners, and payment proof screenshots. Run once after creating the
// Supabase project:
//
//   node --env-file=.env.local scripts/setup-storage.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);
const BUCKET = "uploads";

const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  console.error("Failed to list buckets:", listError.message);
  process.exit(1);
}

if (buckets.some((b) => b.name === BUCKET)) {
  console.log(`Bucket "${BUCKET}" already exists.`);
} else {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  if (error) {
    console.error("Failed to create bucket:", error.message);
    process.exit(1);
  }
  console.log(`Created public bucket "${BUCKET}".`);
}
