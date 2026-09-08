create table if not exists payment_settings (
  id boolean primary key default true,
  upi_id text not null default 'annadhanam@upi',
  qr_image_url text,
  constraint payment_settings_singleton check (id)
);

insert into payment_settings (id) values (true) on conflict (id) do nothing;

alter table payment_settings enable row level security;
