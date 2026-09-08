alter table pandals add column if not exists banner_image_urls text[];
alter table pandals add column if not exists banner_payment_proof_url text;
alter table pandals add column if not exists banner_paid boolean not null default false;
