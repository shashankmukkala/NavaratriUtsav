-- Self-serve paid "star" highlight (₹99 default) — mirrors the existing
-- banner payment-proof flow: owner submits proof, admin reviews it, and
-- approving just flips the existing `featured` boolean (already used for
-- the glowing map-pin highlight) rather than adding a whole parallel state.
alter table payment_settings add column star_price integer not null default 99;
alter table pandals add column star_payment_proof_url text;
