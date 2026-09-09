-- Not every mandapam serves annadhanam on a specific date — some are just
-- the pandal/idol listing. Previously event_date (the annadhanam serving
-- date) and timing_text were required on every submission, forcing anyone
-- without a food-service date to make one up. Now both are optional, and
-- the app splits listings into "Mandapams" (no annadhanam date set) and
-- "Annadhanams" (one is) instead of treating every listing the same way.
alter table pandals alter column event_date drop not null;
alter table pandals alter column timing_text drop not null;
