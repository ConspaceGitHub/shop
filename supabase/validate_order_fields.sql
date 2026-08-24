-- =========================================================
-- place_order() 補上必填文字欄位的後端檢查 (在 Supabase SQL Editor 執行)
-- 不是安全漏洞，是資料完整性補強：避免有人繞過前端表單驗證，
-- 直接呼叫 API 建立姓名/地址是空字串的訂單
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

  if length(trim(coalesce(p_customer_name, ''))) = 0 then
    raise exception '收件人姓名不能是空白';
  end if;

  if length(trim(coalesce(p_customer_email, ''))) = 0 then
    raise exception 'Email 不能是空白';
  end if;

  if length(trim(coalesce(p_shipping_address, ''))) = 0 then
    raise exception '收件地址不能是空白';
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
    p_order_id, p_user_id, trim(p_customer_name), trim(p_customer_email), p_customer_phone,
    trim(p_shipping_address), v_total, v_discount_amount, p_coupon_code
  );

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
