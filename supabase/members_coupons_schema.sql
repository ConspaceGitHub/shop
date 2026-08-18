-- =========================================================
-- 會員 + 優惠券系統 schema (在 Supabase SQL Editor 執行)
-- 前提：products / product_images / orders / order_items / profiles 已存在
-- =========================================================

-- ---------------------------------------------------------
-- 1. members：顧客會員資料（跟後台 profiles 的員工帳號分開）
-- ---------------------------------------------------------
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  birthday date not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

drop policy if exists members_select_own on public.members;
create policy members_select_own on public.members
  for select using (auth.uid() = id);

drop policy if exists members_update_own on public.members;
create policy members_update_own on public.members
  for update using (auth.uid() = id);

drop policy if exists members_insert_own on public.members;
create policy members_insert_own on public.members
  for insert with check (auth.uid() = id);

drop policy if exists members_select_admin on public.members;
create policy members_select_admin on public.members
  for select using (public.is_admin());

-- ---------------------------------------------------------
-- 2. orders：連結會員、加上優惠券欄位
-- ---------------------------------------------------------
alter table public.orders add column if not exists user_id uuid references auth.users (id);
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_amount numeric not null default 0;

create index if not exists orders_user_id_idx on public.orders (user_id);

-- 訪客結帳模式移除：改成只有會員本人能新增/讀取自己的訂單
drop policy if exists orders_insert_public on public.orders;
drop policy if exists orders_select_admin on public.orders;
drop policy if exists orders_update_admin on public.orders;

create policy orders_insert_own on public.orders
  for insert with check (auth.uid() = user_id);

create policy orders_select_own_or_admin on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

create policy orders_update_admin on public.orders
  for update using (public.is_admin());

-- ---------------------------------------------------------
-- 3. coupons：優惠券
-- ---------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_order_amount numeric not null default 0 check (min_order_amount >= 0),
  coupon_type text not null default 'general' check (coupon_type in ('general', 'birthday', 'anniversary')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

drop policy if exists coupons_select_active_or_admin on public.coupons;
create policy coupons_select_active_or_admin on public.coupons
  for select using (is_active = true or public.is_admin());

drop policy if exists coupons_admin_insert on public.coupons;
create policy coupons_admin_insert on public.coupons
  for insert with check (public.is_admin());

drop policy if exists coupons_admin_update on public.coupons;
create policy coupons_admin_update on public.coupons
  for update using (public.is_admin());

drop policy if exists coupons_admin_delete on public.coupons;
create policy coupons_admin_delete on public.coupons
  for delete using (public.is_admin());

-- ---------------------------------------------------------
-- 4. 移除舊的自動建立 profile trigger
--    後台員工帳號一律用 supabase/promote_admin.sql 手動建立，
--    這個 trigger 如果留著，會員註冊時也會被誤塞一筆 profiles 資料
-- ---------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
