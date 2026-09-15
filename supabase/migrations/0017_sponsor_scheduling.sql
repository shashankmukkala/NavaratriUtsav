-- Lets an admin schedule a sponsor ad to start showing on a specific future
-- date (e.g. day 4 of the festival) instead of immediately on approval.
-- Null means "start now", same as before this column existed.
alter table sponsors add column starts_at timestamptz;
