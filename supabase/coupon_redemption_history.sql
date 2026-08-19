-- =========================================================
-- 優惠券使用紀錄加上快照欄位 (在 Supabase SQL Editor 執行)
-- 讓「已使用的優惠券」頁面可以顯示當時的優惠內容，
-- 就算之後 admin 把該優惠券改掉/刪除也不影響歷史紀錄的正確性
-- （跟 order_items 存 unit_price 快照是一樣的邏輯）
-- =========================================================

alter table public.coupon_redemptions add column if not exists title text;
alter table public.coupon_redemptions add column if not exists discount_type text;
alter table public.coupon_redemptions add column if not exists discount_value numeric;

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
  v_coupon_title text;
  v_coupon_discount_type text;
  v_coupon_discount_value numeric;
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
    select title, discount_type, discount_value
    into v_coupon_title, v_coupon_discount_type, v_coupon_discount_value
    from public.coupons
    where code = p_coupon_code;

    insert into public.coupon_redemptions (
      coupon_code, user_id, order_id, title, discount_type, discount_value
    ) values (
      p_coupon_code, p_user_id, p_order_id, v_coupon_title, v_coupon_discount_type, v_coupon_discount_value
    );
  end if;
end;
$$;
