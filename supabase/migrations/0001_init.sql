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
