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
