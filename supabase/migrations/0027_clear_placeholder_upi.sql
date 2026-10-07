-- The original default UPI ID ('annadhanam@upi') was a placeholder from the
-- Ganesh Chaturthi version of the site. Clear it so the app shows "UPI ID not
-- set" until admin enters the real one in /admin → Payment settings, instead
-- of showing people an old, unrelated payee.
alter table payment_settings alter column upi_id set default '';
update payment_settings set upi_id = '' where upi_id = 'annadhanam@upi';
