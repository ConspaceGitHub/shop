-- =========================================================
-- 庫存扣減 + 優惠券防重複使用 (在 Supabase SQL Editor 執行)
-- 核心做法：把「建立訂單、扣庫存、檢查優惠券是否用過」包成一個
-- 資料庫函式 place_order()，在同一個交易裡執行，避免搶購時超賣，
-- 也順便修掉 order_items 會員讀不到自己訂單明細的權限漏洞
-- =========================================================

-- ---------------------------------------------------------
-- 1. coupon_redemptions：優惠券使用紀錄（同一張券同一個會員只能用一次）
-- ---------------------------------------------------------
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_code text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (coupon_code, user_id)
);

alter table public.coupon_redemptions enable row level security;

drop policy if exists coupon_redemptions_select_own_or_admin on public.coupon_redemptions;
create policy coupon_redemptions_select_own_or_admin on public.coupon_redemptions
  for select using (auth.uid() = user_id or public.is_admin());

-- 沒有開放 insert policy 給一般使用者：只有下面的 place_order() 函式
-- (security definer，繞過 RLS) 能寫入這張表，避免有人繞過檢查直接塞資料

-- ---------------------------------------------------------
-- 2. 修正 order_items 的讀取權限：會員應該要能看自己訂單的明細
-- ---------------------------------------------------------
drop policy if exists order_items_select_admin on public.order_items;
drop policy if exists order_items_select_own_or_admin on public.order_items;
create policy order_items_select_own_or_admin on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- 舊的「任何人都能新增訂單/明細」政策移除：
-- 建立訂單一律改走 place_order()，不再開放前端直接 insert
drop policy if exists orders_insert_own on public.orders;
drop policy if exists order_items_insert_public on public.order_items;

-- ---------------------------------------------------------
-- 3. place_order()：建立訂單的唯一入口
--    - 用 for update 鎖住商品列，檢查庫存足夠才放行，避免超賣
--    - 檢查優惠券是否已被這個會員用過
--    - 訂單、明細、扣庫存、優惠券使用紀錄都在同一個交易裡完成
-- ---------------------------------------------------------
create or replace function public.place_order(
  p_order_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_coupon_code text,
  p_discount_amount numeric,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_unit_price numeric;
  v_current_stock int;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception '無權限建立此訂單';
  end if;

  if p_coupon_code is not null and exists (
    select 1 from public.coupon_redemptions
    where coupon_code = p_coupon_code and user_id = p_user_id
  ) then
    raise exception '這張優惠券你已經使用過了';
  end if;

  -- 逐項鎖定商品列並檢查庫存，避免同時搶購時超賣
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    select stock into v_current_stock
    from public.products
    where id = v_product_id
    for update;

    if v_current_stock is null then
      raise exception '商品不存在';
    end if;

    if v_current_stock < v_quantity then
      raise exception '庫存不足，剩餘 % 件，需要 % 件', v_current_stock, v_quantity;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  insert into public.orders (
    id, user_id, customer_name, customer_email, customer_phone,
    shipping_address, total_amount, discount_amount, coupon_code
  ) values (
    p_order_id, p_user_id, p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_address, greatest(v_subtotal - p_discount_amount, 0), p_discount_amount, p_coupon_code
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (p_order_id, v_product_id, v_quantity, v_unit_price);

    update public.products
    set stock = stock - v_quantity
    where id = v_product_id;
  end loop;

  if p_coupon_code is not null then
    insert into public.coupon_redemptions (coupon_code, user_id, order_id)
    values (p_coupon_code, p_user_id, p_order_id);
  end if;
end;
$$;

revoke all on function public.place_order(uuid, uuid, text, text, text, text, text, numeric, jsonb) from public;
grant execute on function public.place_order(uuid, uuid, text, text, text, text, text, numeric, jsonb) to authenticated;

-- ---------------------------------------------------------
-- 4. 訂單取消時自動回補庫存
-- ---------------------------------------------------------
create or replace function public.restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.products p
    set stock = p.stock + oi.quantity
    from public.order_items oi
    where oi.order_id = new.id and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_cancelled on public.orders;
create trigger on_order_cancelled
  after update on public.orders
  for each row execute function public.restore_stock_on_cancel();
