-- Navaratri Utsav — full backend setup (tables, settings row, analytics
-- function, storage bucket). Generated from supabase/migrations/0001–0028,
-- in order. Paste this whole file into the Supabase SQL Editor and Run.
-- Safe to re-run: every statement is if-not-exists / on-conflict / drop-then-add.

-- 0001_init.sql ----------------------------------------------
-- Annadhanam pandals (Ganesh Chaturthi community food-offering locations)
create table if not exists pandals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organizer_name text not null,
  contact_phone text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  event_date date not null,
  timing_text text not null,
  description text,
  image_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists pandals_status_idx on pandals (status);

-- Sponsor banners: the digital version of the physical banners people put up
-- at pandals (youth associations, local sponsors, political leaders, etc.)
create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  pandal_id uuid references pandals (id) on delete cascade,
  sponsor_name text not null,
  contact_phone text not null,
  banner_image_url text,
  payment_proof_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists sponsors_status_idx on sponsors (status);
create index if not exists sponsors_pandal_id_idx on sponsors (pandal_id);

-- RLS is enabled with no policies: only the service-role key (used exclusively
-- by server-side API routes, never shipped to the browser) can read or write
-- these tables. There is no Supabase Auth / anon-key access in this app at all.
alter table pandals enable row level security;
alter table sponsors enable row level security;


-- 0002_add_sponsor_link.sql ----------------------------------------------
-- Where a sponsor's ad banner should send someone who clicks it (their
-- website, Instagram, WhatsApp catalog, etc). Optional — an ad without one
-- just isn't clickable.
alter table sponsors add column if not exists link_url text;


-- 0003_sponsor_multi_banner.sql ----------------------------------------------
-- Sponsors can now upload up to 3 banner images that rotate as a slideshow
-- in the map's ad slot. banner_image_url (single image) stays for backward
-- compatibility with any existing rows but new submissions use this array.
alter table sponsors add column if not exists banner_image_urls text[];


-- 0004_sponsor_expiry.sql ----------------------------------------------
-- Each ad payment covers 2 days of display, starting when an admin approves
-- it. NULL means "not yet approved / no expiry set".
alter table sponsors add column if not exists expires_at timestamptz;


-- 0005_pandal_own_banner.sql ----------------------------------------------
alter table pandals add column if not exists banner_image_urls text[];
alter table pandals add column if not exists banner_payment_proof_url text;
alter table pandals add column if not exists banner_paid boolean not null default false;


-- 0006_payment_settings.sql ----------------------------------------------
create table if not exists payment_settings (
  id boolean primary key default true,
  upi_id text not null default 'annadhanam@upi',
  qr_image_url text,
  constraint payment_settings_singleton check (id)
);

insert into payment_settings (id) values (true) on conflict (id) do nothing;

alter table payment_settings enable row level security;


-- 0007_user_accounts.sql ----------------------------------------------
-- Tags submissions with the Google account that made them (NextAuth's
-- stable Google user id, not a row in our own users table — we don't run
-- one). Nullable so existing rows created before accounts existed stay valid.
alter table pandals add column if not exists user_id text;
alter table sponsors add column if not exists user_id text;

create index if not exists pandals_user_id_idx on pandals (user_id);
create index if not exists sponsors_user_id_idx on sponsors (user_id);


-- 0008_sponsor_placement.sql ----------------------------------------------
-- Replaces "pick one specific mandapam" targeting for the cheaper ad tier
-- with a plain placement: shown generically inside mandapam cards ('card')
-- vs the map-wide sponsored slots ('map'). pandal_id stays for old rows but
-- is no longer set by new submissions.
alter table sponsors add column if not exists placement text not null default 'map' check (placement in ('map', 'card'));

notify pgrst, 'reload schema';


-- 0009_pandal_edit_request.sql ----------------------------------------------
-- Editing a live/approved mandapam's core details needs a fresh admin
-- look before it takes effect — this tracks that as an explicit
-- request/approval flow instead of letting owners silently rewrite an
-- already-reviewed listing. Adding/replacing the optional association
-- banner is unaffected by this — that's still always available and
-- gated only by admin confirming the ₹200 payment (banner_paid).
alter table pandals add column if not exists edit_requested boolean not null default false;
alter table pandals add column if not exists edit_unlocked boolean not null default false;


-- 0010_pandal_admin_note.sql ----------------------------------------------
-- Lets an admin leave a short note for the owner — why an edit was denied,
-- why a listing was rejected, or anything else — surfaced on their profile
-- page until they dismiss it.
alter table pandals add column if not exists admin_note text;


-- 0011_sponsor_edit_request.sql ----------------------------------------------
-- Ads (sponsors), not mandapams, are the ones that need admin approval to
-- edit — a mandapam owner can freely edit their own listing any time.
alter table sponsors add column if not exists edit_requested boolean not null default false;
alter table sponsors add column if not exists edit_unlocked boolean not null default false;


-- 0012_users_and_page_views.sql ----------------------------------------------
-- Tracks who has signed in (there was no persisted user record at all
-- before this — auth is stateless JWT) and every page load, so the admin
-- dashboard can show registered-user and visit counts.
create table if not exists users (
  id text primary key,
  email text,
  name text,
  image text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views (created_at);

-- RLS enabled with no policies, same as every other table here — only the
-- service-role key (server-side API routes) reads or writes these.
alter table users enable row level security;
alter table page_views enable row level security;


-- 0013_unique_visitors.sql ----------------------------------------------
-- Every page_views row was a raw hit with no way to tell "10 visits from
-- one person" apart from "10 different people" — this adds a per-browser
-- anonymous id (generated client-side, stored in localStorage) so the
-- admin dashboard can show a real unique-visitor count alongside raw views.
alter table page_views add column if not exists visitor_id text;

create index if not exists page_views_visitor_id_idx on page_views (visitor_id);

-- count(distinct ...) isn't expressible through Supabase's JS count option
-- (that only counts rows), so this is a small SQL function the admin
-- analytics route calls via .rpc(). "since" is optional so the same
-- function covers the all-time and windowed (24h/7d) figures.
create or replace function count_unique_visitors(since timestamptz default null)
returns bigint
language sql
stable
as $$
  select count(distinct visitor_id)::bigint
  from page_views
  where visitor_id is not null
    and (since is null or created_at >= since);
$$;


-- 0014_optional_annadhanam_date.sql ----------------------------------------------
-- Not every mandapam serves annadhanam on a specific date — some are just
-- the pandal/idol listing. Previously event_date (the annadhanam serving
-- date) and timing_text were required on every submission, forcing anyone
-- without a food-service date to make one up. Now both are optional, and
-- the app splits listings into "Mandapams" (no annadhanam date set) and
-- "Annadhanams" (one is) instead of treating every listing the same way.
alter table pandals alter column event_date drop not null;
alter table pandals alter column timing_text drop not null;


-- 0015_configurable_ad_prices.sql ----------------------------------------------
-- Ad/banner prices were hardcoded (₹500 map ads, ₹200 card ads, ₹200
-- banners) across half a dozen pages. Admin can now edit them from
-- /admin, and every page reads the live value instead of a baked-in number.
alter table payment_settings
  add column if not exists map_ad_price integer not null default 500,
  add column if not exists card_ad_price integer not null default 200,
  add column if not exists banner_price integer not null default 200;


-- 0016_nimajjanam_date.sql ----------------------------------------------
-- Nimajjanam (idol immersion) date — separate from the annadhanam serving
-- date, since a mandapam's immersion procession day is its own thing and
-- doesn't necessarily line up with when food is served.
alter table pandals add column if not exists nimajjanam_date date;


-- 0017_sponsor_scheduling.sql ----------------------------------------------
-- Lets an admin schedule a sponsor ad to start showing on a specific future
-- date (e.g. day 4 of the festival) instead of immediately on approval.
-- Null means "start now", same as before this column existed.
alter table sponsors add column if not exists starts_at timestamptz;


-- 0018_annadhanam_date_range.sql ----------------------------------------------
-- Some mandapams serve annadhanam every day until the last day of the
-- festival, not just one date. event_date_end (inclusive), when set, means
-- "serving every day from event_date through event_date_end" instead of
-- just event_date alone. Null means a single-day listing, same as before.
alter table pandals add column if not exists event_date_end date;


-- 0019_source_image_url.sql ----------------------------------------------
-- Stores the original, uncropped photo URL for pandals whose photo wasn't
-- cropped through the app's own upload tool (e.g. the bulk CSV import) —
-- lets the admin board re-crop from the real original instead of the
-- already-cropped file, which has no extra pixels left to recover.
alter table pandals add column if not exists source_image_url text;


-- 0020_featured_pandals.sql ----------------------------------------------
-- Lets admin mark a mandapam as "featured" (e.g. a milestone anniversary
-- year) — gets a glowing/pulsing highlight on the map pin and a badge on
-- its card. milestone_text is the badge's own text (e.g. "114th Year"),
-- kept separate from the boolean so admin can turn the highlight off
-- without losing what was typed.
alter table pandals add column if not exists featured boolean not null default false;
alter table pandals add column if not exists milestone_text text;


-- 0021_thumbnail_url.sql ----------------------------------------------
-- A small thumbnail (~160px) for every pandal photo, used for map markers
-- and other tiny thumbnail spots instead of the full-resolution photo —
-- the map was loading every pandal's full image just to render a ~30px
-- circle, which is what actually drove the cached-egress overage.
alter table pandals add column if not exists thumbnail_url text;


-- 0022_extra_pandal_images.sql ----------------------------------------------
-- Up to 3 additional photos alongside the existing single image_url (cover
-- photo), for a small gallery instead of just one hero shot — max 4 total,
-- enforced client-side by MultiImageUploadField's `max` prop.
alter table pandals add column if not exists extra_image_urls text[];


-- 0023_star_highlight.sql ----------------------------------------------
-- Self-serve paid "star" highlight (₹99 default) — mirrors the existing
-- banner payment-proof flow: owner submits proof, admin reviews it, and
-- approving just flips the existing `featured` boolean (already used for
-- the glowing map-pin highlight) rather than adding a whole parallel state.
alter table payment_settings add column if not exists star_price integer not null default 99;
alter table pandals add column if not exists star_payment_proof_url text;


-- 0024_crow_ads.sql ----------------------------------------------
-- A third, premium sponsor placement: an animated crow towing the
-- sponsor's banner across the map, same 2-day paid-run model as the
-- existing map/card ads (reuses the sponsors table as-is).
alter table sponsors drop constraint if exists sponsors_placement_check;
alter table sponsors add constraint sponsors_placement_check check (placement in ('map', 'card', 'crow'));

alter table payment_settings add column if not exists crow_ad_price integer not null default 300;
-- How often (in seconds) a flying ad makes a pass across the map — admin-configurable.
alter table payment_settings add column if not exists crow_interval_seconds integer not null default 45;

-- The sponsor only ever supplies the banner content — which object carries
-- it (a crow, a rocket, ...) is an admin choice made per ad at approval
-- time, not something the sponsor picks.
alter table sponsors add column if not exists vehicle text not null default 'crow' check (vehicle in ('crow', 'rocket'));


-- 0025_phoenix_vehicle.sql ----------------------------------------------
-- A third flying-ad vehicle option: a golden phoenix, alongside the
-- existing crow and rocket.
alter table sponsors drop constraint if exists sponsors_vehicle_check;
alter table sponsors add constraint sponsors_vehicle_check check (vehicle in ('crow', 'rocket', 'phoenix'));


-- 0026_listing_category.sql ----------------------------------------------
-- Navaratri Utsav: every listing is one of three kinds, so the homepage
-- and map can filter by Pandals / Dandiya / Cultural Events. Existing rows
-- (all pandal/mandapam listings) default to 'pandal'.
alter table pandals add column if not exists category text not null default 'pandal';
alter table pandals drop constraint if exists pandals_category_check;
alter table pandals add constraint pandals_category_check check (category in ('pandal', 'dandiya', 'cultural'));


-- 0027_clear_placeholder_upi.sql ----------------------------------------------
-- The original default UPI ID ('annadhanam@upi') was a placeholder from the
-- Ganesh Chaturthi version of the site. Clear it so the app shows "UPI ID not
-- set" until admin enters the real one in /admin → Payment settings, instead
-- of showing people an old, unrelated payee.
alter table payment_settings alter column upi_id set default '';
update payment_settings set upi_id = '' where upi_id = 'annadhanam@upi';


-- 0028_storage_bucket_and_rpc_grants.sql ----------------------------------------------
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

