-- Ad/banner prices were hardcoded (₹500 map ads, ₹200 card ads, ₹200
-- banners) across half a dozen pages. Admin can now edit them from
-- /admin, and every page reads the live value instead of a baked-in number.
alter table payment_settings
  add column if not exists map_ad_price integer not null default 500,
  add column if not exists card_ad_price integer not null default 200,
  add column if not exists banner_price integer not null default 200;
