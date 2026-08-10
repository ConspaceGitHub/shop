-- =========================================================
-- 植物商店 - 補充 schema (在 Supabase SQL Editor 執行)
-- 前提：products / product_images / orders / order_items 已存在
--   orders 走「訪客結帳」模式：不需要顧客登入，
--   結帳時直接填 customer_name / customer_email / customer_phone / shipping_address
--   orders.status 允許值：pending / paid / shipped / completed / cancelled
-- 這份腳本只新增「業者後台登入用」的 profiles 表 + 權限規則
-- =========================================================

-- ---------------------------------------------------------
-- 1. profiles：業者(管理員)登入帳號的角色資料
--    顧客不需要帳號，這張表只給後台管理員用
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

-- 有新帳號在 Supabase Auth 註冊/建立時，自動在 profiles 建立一筆資料
-- 預設角色是 'staff'（非管理員），要升級成 admin 必須手動在 SQL Editor 執行 UPDATE
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- 2. 權限判斷 helper：is_admin()
--    用 security definer 避免 RLS policy 互相遞迴查詢的問題
-- ---------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles：本人可讀自己的資料；admin 可讀全部（後台可能會列出員工）
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

-- products：所有人（含未登入訪客）可讀；只有 admin 可寫
drop policy if exists products_select_public on public.products;
create policy products_select_public on public.products
  for select using (true);

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
  for insert with check (public.is_admin());

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
  for update using (public.is_admin());

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
  for delete using (public.is_admin());

-- product_images：所有人可讀；只有 admin 可寫
drop policy if exists product_images_select_public on public.product_images;
create policy product_images_select_public on public.product_images
  for select using (true);

drop policy if exists product_images_admin_insert on public.product_images;
create policy product_images_admin_insert on public.product_images
  for insert with check (public.is_admin());

drop policy if exists product_images_admin_update on public.product_images;
create policy product_images_admin_update on public.product_images
  for update using (public.is_admin());

drop policy if exists product_images_admin_delete on public.product_images;
create policy product_images_admin_delete on public.product_images
  for delete using (public.is_admin());

-- orders：訪客結帳 = 任何人都可以「新增」訂單；
-- 但只有 admin 可以「讀取／更新」訂單（避免任何人都能看到別人的訂單資料）
drop policy if exists orders_insert_public on public.orders;
create policy orders_insert_public on public.orders
  for insert with check (true);

drop policy if exists orders_select_admin on public.orders;
create policy orders_select_admin on public.orders
  for select using (public.is_admin());

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
  for update using (public.is_admin());

-- order_items：結帳當下需要新增明細；讀取只開放給 admin
drop policy if exists order_items_insert_public on public.order_items;
create policy order_items_insert_public on public.order_items
  for insert with check (true);

drop policy if exists order_items_select_admin on public.order_items;
create policy order_items_select_admin on public.order_items
  for select using (public.is_admin());
