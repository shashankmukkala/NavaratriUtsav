-- BappaSeva — full schema setup. Safe to run once on a fresh Supabase
-- project; every statement is idempotent (if-not-exists / add-column-if-
-- not-exists), so it's also safe to re-run. Combines migrations
-- 0001–0006 in order. Run this whole file in the Supabase SQL Editor.

-- 0001_init.sql ---------------------------------------------------------
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

-- RLS is enabled with no policies: only the service-role key (used
-- exclusively by server-side API routes) can read or write these tables.
alter table pandals enable row level security;
alter table sponsors enable row level security;

-- 0002_add_sponsor_link.sql ----------------------------------------------
alter table sponsors add column if not exists link_url text;

-- 0003_sponsor_multi_banner.sql -------------------------------------------
alter table sponsors add column if not exists banner_image_urls text[];

-- 0004_sponsor_expiry.sql --------------------------------------------------
alter table sponsors add column if not exists expires_at timestamptz;

-- 0005_pandal_own_banner.sql -----------------------------------------------
alter table pandals add column if not exists banner_image_urls text[];
alter table pandals add column if not exists banner_payment_proof_url text;
alter table pandals add column if not exists banner_paid boolean not null default false;

-- 0006_payment_settings.sql ------------------------------------------------
create table if not exists payment_settings (
  id boolean primary key default true,
  upi_id text not null default 'annadhanam@upi',
  qr_image_url text,
  constraint payment_settings_singleton check (id)
);

insert into payment_settings (id) values (true) on conflict (id) do nothing;

alter table payment_settings enable row level security;
