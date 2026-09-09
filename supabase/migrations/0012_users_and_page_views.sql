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
