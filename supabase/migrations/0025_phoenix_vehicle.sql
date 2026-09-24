-- A third flying-ad vehicle option: a golden phoenix, alongside the
-- existing crow and rocket.
alter table sponsors drop constraint if exists sponsors_vehicle_check;
alter table sponsors add constraint sponsors_vehicle_check check (vehicle in ('crow', 'rocket', 'phoenix'));
