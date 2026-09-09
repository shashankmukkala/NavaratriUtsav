-- Ads (sponsors), not mandapams, are the ones that need admin approval to
-- edit — a mandapam owner can freely edit their own listing any time.
alter table sponsors add column if not exists edit_requested boolean not null default false;
alter table sponsors add column if not exists edit_unlocked boolean not null default false;
