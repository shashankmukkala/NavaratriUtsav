-- Where a sponsor's ad banner should send someone who clicks it (their
-- website, Instagram, WhatsApp catalog, etc). Optional — an ad without one
-- just isn't clickable.
alter table sponsors add column if not exists link_url text;
