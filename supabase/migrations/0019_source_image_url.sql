-- Stores the original, uncropped photo URL for pandals whose photo wasn't
-- cropped through the app's own upload tool (e.g. the bulk CSV import) —
-- lets the admin board re-crop from the real original instead of the
-- already-cropped file, which has no extra pixels left to recover.
alter table pandals add column source_image_url text;
