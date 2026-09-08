-- Replaces "pick one specific mandapam" targeting for the cheaper ad tier
-- with a plain placement: shown generically inside mandapam cards ('card')
-- vs the map-wide sponsored slots ('map'). pandal_id stays for old rows but
-- is no longer set by new submissions.
alter table sponsors add column if not exists placement text not null default 'map' check (placement in ('map', 'card'));

notify pgrst, 'reload schema';
