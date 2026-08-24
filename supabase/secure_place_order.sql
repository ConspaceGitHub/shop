-- =========================================================
-- 修補 place_order() 的價格竄改漏洞 (在 Supabase SQL Editor 執行)
-- 問題：unit_price、discount_amount 之前完全採信前端傳來的數字，
-- 只要繞過畫面直接呼叫這支 RPC（例如在瀏覽器 Console 貼程式碼），
-- 就能把價格改成任意數字結帳。
-- 修法：價格一律由後端重新查資料庫裡的真實價格計算，
-- 優惠券折扣也由後端重新查優惠券資料計算，完全不採信前端傳來的金額。
-- 同時補上 quantity 必須為正整數的檢查，避免用負數讓庫存不減反增。
-- =========================================================

create or replace function public.place_order(
  p_order_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_coupon_code text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric := 0;
  v_discount_amount numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_actual_price numeric;
  v_current_stock int;
  v_coupon record;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception '無權限建立此訂單';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception '購物車是空的';
  end if;

  if p_coupon_code is not null and exists (
    select 1 from public.coupon_redemptions
    where coupon_code = p_coupon_code and user_id = p_user_id
  ) then
    raise exception '這張優惠券你已經使用過了';
  end if;

  -- 第一輪：鎖定庫存、檢查數量、用資料庫裡「真實」的價格計算小計
  -- 絕不採信前端傳來的 unit_price，避免有人繞過畫面直接竄改金額
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;

    if v_quantity is null or v_quantity <= 0 then
      raise exception '商品數量不正確';
    end if;

    select price, stock into v_actual_price, v_current_stock
    from public.products
    where id = v_product_id
    for update;

    if v_current_stock is null then
      raise exception '商品不存在';
    end if;

    if v_current_stock < v_quantity then
      raise exception '庫存不足，剩餘 % 件，需要 % 件', v_current_stock, v_quantity;
    end if;

    v_subtotal := v_subtotal + (v_actual_price * v_quantity);
  end loop;

  -- 優惠券折扣同樣由後端重新計算，不採信前端傳來的折扣金額
  if p_coupon_code is not null then
    select * into v_coupon
    from public.coupons
    where code = p_coupon_code
      and is_active = true
      and starts_at <= now()
      and (ends_at is null or ends_at >= now());

    if v_coupon.code is null then
      raise exception '這張優惠券目前無法使用';
    end if;

    if v_subtotal < v_coupon.min_order_amount then
      raise exception '未達優惠券最低消費金額';
    end if;

    if v_coupon.discount_type = 'percentage' then
      v_discount_amount := round(v_subtotal * (v_coupon.discount_value / 100));
    else
      v_discount_amount := least(v_coupon.discount_value, v_subtotal);
    end if;
  end if;

  v_total := greatest(v_subtotal - v_discount_amount, 0);

  insert into public.orders (
    id, user_id, customer_name, customer_email, customer_phone,
    shipping_address, total_amount, discount_amount, coupon_code
  ) values (
    p_order_id, p_user_id, p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_address, v_total, v_discount_amount, p_coupon_code
  );

  -- 第二輪：寫入明細並扣庫存（商品列在第一輪已經鎖定，這裡重新查一次拿到同樣的價格）
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;

    select price into v_actual_price from public.products where id = v_product_id;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (p_order_id, v_product_id, v_quantity, v_actual_price);

    update public.products
    set stock = stock - v_quantity
    where id = v_product_id;
  end loop;

  if p_coupon_code is not null then
    insert into public.coupon_redemptions (
      coupon_code, user_id, order_id, title, discount_type, discount_value
    ) values (
      p_coupon_code, p_user_id, p_order_id, v_coupon.title, v_coupon.discount_type, v_coupon.discount_value
    );
  end if;

  return jsonb_build_object(
    'subtotal', v_subtotal,
    'discount_amount', v_discount_amount,
    'total_amount', v_total
  );
end;
$$;

revoke all on function public.place_order(uuid, uuid, text, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(uuid, uuid, text, text, text, text, text, jsonb) to authenticated;

-- 舊版函式簽名（多一個 p_discount_amount 參數）不會再被呼叫到，但保留在資料庫裡
-- 沒有實質風險（一樣要通過 auth.uid() 檢查），為了乾淨還是移除舊版本
drop function if exists public.place_order(uuid, uuid, text, text, text, text, text, numeric, jsonb);
