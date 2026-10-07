-- Navaratri Utsav: every listing is one of three kinds, so the homepage
-- and map can filter by Pandals / Dandiya / Cultural Events. Existing rows
-- (all pandal/mandapam listings) default to 'pandal'.
alter table pandals add column if not exists category text not null default 'pandal';
alter table pandals drop constraint if exists pandals_category_check;
alter table pandals add constraint pandals_category_check check (category in ('pandal', 'dandiya', 'cultural'));
