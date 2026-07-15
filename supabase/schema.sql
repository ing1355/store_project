-- Store Dashboard schema (JSON-friendly)
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- menus
-- ---------------------------------------------------------------------------
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category text not null default '',
  name text not null,
  price integer not null default 0 check (price >= 0),
  cost integer not null default 0 check (cost >= 0),
  initial_stock integer not null default 0,
  safety_stock integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menus_category_idx on public.menus (category);
create index if not exists menus_code_idx on public.menus (code);

-- ---------------------------------------------------------------------------
-- sales (line items stored as jsonb array)
-- items example:
-- [{"menu_id":"...","name":"삼겹살","price":12000,"qty":2}]
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  sale_time text not null default '12:00',
  payment_method text not null check (
    payment_method in ('cash', 'card', 'point', 'credit', 'etc')
  ),
  total integer not null default 0 check (total >= 0),
  memo text,
  items jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sales_date_idx on public.sales (sale_date desc);
create index if not exists sales_payment_idx on public.sales (payment_method);

-- ---------------------------------------------------------------------------
-- stock_movements
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_date date not null,
  menu_id uuid not null references public.menus (id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  qty integer not null check (qty > 0),
  memo text,
  sale_id uuid references public.sales (id) on delete cascade,
  manual boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_date_idx
  on public.stock_movements (movement_date desc);
create index if not exists stock_movements_menu_idx
  on public.stock_movements (menu_id);
create index if not exists stock_movements_sale_idx
  on public.stock_movements (sale_id);

-- One inbound row per menu per day
create unique index if not exists stock_inbound_unique
  on public.stock_movements (movement_date, menu_id)
  where type = 'in' and manual = false;

-- One manual outbound correction per menu per day
create unique index if not exists stock_manual_out_unique
  on public.stock_movements (movement_date, menu_id)
  where type = 'out' and manual = true;

-- updated_at trigger for menus
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menus_set_updated_at on public.menus;
create trigger menus_set_updated_at
  before update on public.menus
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: single-store / internal use — anon CRUD allowed (tighten later with Auth)
-- ---------------------------------------------------------------------------
alter table public.menus enable row level security;
alter table public.sales enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists menus_anon_all on public.menus;
create policy menus_anon_all on public.menus
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists sales_anon_all on public.sales;
create policy sales_anon_all on public.sales
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists stock_movements_anon_all on public.stock_movements;
create policy stock_movements_anon_all on public.stock_movements
  for all to anon, authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- expense_categories (운영지출 분류 마스터)
-- ---------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expense_categories_sort_idx
  on public.expense_categories (sort_order, name);

-- ---------------------------------------------------------------------------
-- expenses (일일 운영지출)
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null default '',
  description text not null default '',
  amount integer not null default 0 check (amount >= 0),
  vendor text not null default '',
  memo text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expenses_date_idx
  on public.expenses (expense_date desc);
create index if not exists expenses_category_idx
  on public.expenses (category);

-- ---------------------------------------------------------------------------
-- special_incomes (쿠폰/기부 등 특이수입)
-- ---------------------------------------------------------------------------
create table if not exists public.special_incomes (
  id uuid primary key default gen_random_uuid(),
  income_date date not null,
  type text not null check (type in ('coupon', 'donation', 'other')),
  amount integer not null default 0 check (amount >= 0),
  memo text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists special_incomes_date_idx
  on public.special_incomes (income_date desc);
create index if not exists special_incomes_type_idx
  on public.special_incomes (type);

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.special_incomes enable row level security;

drop policy if exists expense_categories_authenticated_all on public.expense_categories;
create policy expense_categories_authenticated_all on public.expense_categories
  for all to authenticated
  using (true) with check (true);

drop policy if exists expenses_authenticated_all on public.expenses;
create policy expenses_authenticated_all on public.expenses
  for all to authenticated
  using (true) with check (true);

drop policy if exists special_incomes_authenticated_all on public.special_incomes;
create policy special_incomes_authenticated_all on public.special_incomes
  for all to authenticated
  using (true) with check (true);
