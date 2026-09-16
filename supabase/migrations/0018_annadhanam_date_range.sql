-- Some mandapams serve annadhanam every day until the last day of the
-- festival, not just one date. event_date_end (inclusive), when set, means
-- "serving every day from event_date through event_date_end" instead of
-- just event_date alone. Null means a single-day listing, same as before.
alter table pandals add column event_date_end date;
