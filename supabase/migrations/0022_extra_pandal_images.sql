-- Up to 3 additional photos alongside the existing single image_url (cover
-- photo), for a small gallery instead of just one hero shot — max 4 total,
-- enforced client-side by MultiImageUploadField's `max` prop.
alter table pandals add column extra_image_urls text[];
