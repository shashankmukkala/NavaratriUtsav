-- Tags submissions with the Google account that made them (NextAuth's
-- stable Google user id, not a row in our own users table — we don't run
-- one). Nullable so existing rows created before accounts existed stay valid.
alter table pandals add column if not exists user_id text;
alter table sponsors add column if not exists user_id text;

create index if not exists pandals_user_id_idx on pandals (user_id);
create index if not exists sponsors_user_id_idx on sponsors (user_id);
