-- A small thumbnail (~160px) for every pandal photo, used for map markers
-- and other tiny thumbnail spots instead of the full-resolution photo —
-- the map was loading every pandal's full image just to render a ~30px
-- circle, which is what actually drove the cached-egress overage.
alter table pandals add column thumbnail_url text;
