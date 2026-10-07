-- The public "uploads" bucket for listing photos, sponsor banners, payment
-- proofs and the settings QR code — same settings as
-- scripts/setup-storage.mjs (5MB, images only), so a fresh project needs
-- nothing beyond the SQL Editor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Only the server (service role) calls this, from /api/admin/analytics —
-- don't leave it callable through the public API with the anon key.
revoke execute on function count_unique_visitors(timestamptz) from public, anon, authenticated;
grant execute on function count_unique_visitors(timestamptz) to service_role;

notify pgrst, 'reload schema';
