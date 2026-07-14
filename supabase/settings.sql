-- Incremental: app settings + menu categories
-- Already applied via MCP; kept for local/docs replay

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, low_stock_threshold)
values (1, 10)
on conflict (id) do nothing;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists menu_categories_sort_idx
  on public.menu_categories (sort_order, name);

insert into public.menu_categories (name, sort_order) values
  ('고기류', 1),
  ('식사류', 2),
  ('주류', 3),
  ('음료', 4),
  ('안주류', 5),
  ('기타', 6)
on conflict (name) do nothing;

alter table public.app_settings enable row level security;
alter table public.menu_categories enable row level security;

drop policy if exists app_settings_anon_all on public.app_settings;
create policy app_settings_anon_all on public.app_settings
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists menu_categories_anon_all on public.menu_categories;
create policy menu_categories_anon_all on public.menu_categories
  for all to anon, authenticated
  using (true) with check (true);
