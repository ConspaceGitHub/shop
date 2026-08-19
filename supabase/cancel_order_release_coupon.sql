-- =========================================================
-- 訂單取消時，優惠券使用紀錄也要一併釋放 (在 Supabase SQL Editor 執行)
-- 不然一張優惠券只要被用在一筆之後取消的訂單上，就會永久卡死不能再用
-- =========================================================

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

    delete from public.coupon_redemptions where order_id = new.id;
  end if;
  return new;
end;
$$;
