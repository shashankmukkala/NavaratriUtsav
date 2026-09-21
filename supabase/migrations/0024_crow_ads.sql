-- A third, premium sponsor placement: an animated crow towing the
-- sponsor's banner across the map, same 2-day paid-run model as the
-- existing map/card ads (reuses the sponsors table as-is).
alter table sponsors drop constraint if exists sponsors_placement_check;
alter table sponsors add constraint sponsors_placement_check check (placement in ('map', 'card', 'crow'));

alter table payment_settings add column crow_ad_price integer not null default 300;
-- How often (in seconds) a flying ad makes a pass across the map — admin-configurable.
alter table payment_settings add column crow_interval_seconds integer not null default 45;

-- The sponsor only ever supplies the banner content — which object carries
-- it (a crow, a rocket, ...) is an admin choice made per ad at approval
-- time, not something the sponsor picks.
alter table sponsors add column vehicle text not null default 'crow' check (vehicle in ('crow', 'rocket'));
