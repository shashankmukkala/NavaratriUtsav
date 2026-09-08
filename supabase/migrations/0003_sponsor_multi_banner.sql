-- Sponsors can now upload up to 3 banner images that rotate as a slideshow
-- in the map's ad slot. banner_image_url (single image) stays for backward
-- compatibility with any existing rows but new submissions use this array.
alter table sponsors add column if not exists banner_image_urls text[];
