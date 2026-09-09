-- Lets an admin leave a short note for the owner — why an edit was denied,
-- why a listing was rejected, or anything else — surfaced on their profile
-- page until they dismiss it.
alter table pandals add column if not exists admin_note text;
