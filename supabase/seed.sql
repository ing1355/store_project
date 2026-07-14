-- Run AFTER schema.sql in Supabase SQL Editor
-- Also run settings.sql for app_settings + menu_categories

-- Clear existing (dev seed only)
truncate table public.stock_movements restart identity cascade;
truncate table public.sales restart identity cascade;
truncate table public.menus restart identity cascade;

insert into public.menus (
  id, code, category, name, price, cost, initial_stock, safety_stock, meta
) values
  ('11111111-1111-1111-1111-111111111001', '00001', '고기류', '삼겹살', 12000, 7000, 80, 15, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111002', '00002', '고기류', '목살', 13000, 7500, 60, 12, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111003', '00003', '고기류', '항정살', 15000, 9000, 40, 8, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111018', '00018', '식사류', '공기밥', 1000, 300, 200, 40, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111019', '00019', '식사류', '된장찌개', 3000, 1200, 50, 10, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111020', '00020', '식사류', '김치찌개', 3500, 1400, 50, 10, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111025', '00025', '식사류', '볶음밥', 5000, 2000, 45, 10, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111026', '00026', '식사류', '라면', 3500, 1000, 80, 15, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111032', '00032', '주류', '맥주', 4000, 1800, 120, 24, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111033', '00033', '주류', '소주', 4000, 2000, 150, 30, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111034', '00034', '주류', '청하', 4500, 2200, 40, 8, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111040', '00040', '음료', '콜라', 2000, 800, 100, 20, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111041', '00041', '음료', '사이다', 2000, 800, 100, 20, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111042', '00042', '음료', '이온음료', 2000, 900, 80, 16, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111050', '00050', '안주류', '감자튀김', 5000, 1800, 60, 12, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111051', '00051', '안주류', '치킨너겟', 6000, 2500, 50, 10, '{}'::jsonb);

-- Today's sample inbound for all menus
insert into public.stock_movements (movement_date, menu_id, type, qty, memo, manual)
select
  current_date,
  m.id,
  'in',
  case
    when m.category in ('주류', '음료') then 15
    when m.category = '고기류' then 10
    else 8
  end,
  '시드 입고',
  false
from public.menus m;

-- Sample sale today (JSON items)
insert into public.sales (
  id, sale_date, sale_time, payment_method, total, memo, items, meta
) values (
  '22222222-2222-2222-2222-222222222001',
  current_date,
  '12:30',
  'card',
  28000,
  '샘플 거래',
  jsonb_build_array(
    jsonb_build_object(
      'menu_id', '11111111-1111-1111-1111-111111111001',
      'name', '삼겹살',
      'price', 12000,
      'qty', 2
    ),
    jsonb_build_object(
      'menu_id', '11111111-1111-1111-1111-111111111032',
      'name', '맥주',
      'price', 4000,
      'qty', 1
    )
  ),
  '{}'::jsonb
);

insert into public.stock_movements (
  movement_date, menu_id, type, qty, sale_id, manual
) values
  (
    current_date,
    '11111111-1111-1111-1111-111111111001',
    'out',
    2,
    '22222222-2222-2222-2222-222222222001',
    false
  ),
  (
    current_date,
    '11111111-1111-1111-1111-111111111032',
    'out',
    1,
    '22222222-2222-2222-2222-222222222001',
    false
  );
