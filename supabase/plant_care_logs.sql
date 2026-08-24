-- =========================================================
-- 我的植物照護紀錄 schema (在 Supabase SQL Editor 執行)
-- 讓會員針對「買過的商品」記錄澆水/換盆/施肥，只有本人能讀寫自己的紀錄
-- =========================================================

create table if not exists public.plant_care_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  event_type text not null check (event_type in ('watered', 'repotted', 'fertilized')),
  logged_at timestamptz not null default now()
);

create index if not exists plant_care_logs_user_product_idx
  on public.plant_care_logs (user_id, product_id, event_type, logged_at desc);

alter table public.plant_care_logs enable row level security;

drop policy if exists plant_care_logs_select_own on public.plant_care_logs;
create policy plant_care_logs_select_own on public.plant_care_logs
  for select using (auth.uid() = user_id);

drop policy if exists plant_care_logs_insert_own on public.plant_care_logs;
create policy plant_care_logs_insert_own on public.plant_care_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists plant_care_logs_delete_own on public.plant_care_logs;
create policy plant_care_logs_delete_own on public.plant_care_logs
  for delete using (auth.uid() = user_id);
