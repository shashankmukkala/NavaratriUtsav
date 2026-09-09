-- Editing a live/approved mandapam's core details needs a fresh admin
-- look before it takes effect — this tracks that as an explicit
-- request/approval flow instead of letting owners silently rewrite an
-- already-reviewed listing. Adding/replacing the optional association
-- banner is unaffected by this — that's still always available and
-- gated only by admin confirming the ₹200 payment (banner_paid).
alter table pandals add column if not exists edit_requested boolean not null default false;
alter table pandals add column if not exists edit_unlocked boolean not null default false;
