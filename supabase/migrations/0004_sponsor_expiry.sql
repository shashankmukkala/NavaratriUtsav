-- Each ad payment covers 2 days of display, starting when an admin approves
-- it. NULL means "not yet approved / no expiry set".
alter table sponsors add column if not exists expires_at timestamptz;
