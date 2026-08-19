-- =========================================================
-- 會員自行取消訂單 (在 Supabase SQL Editor 執行)
-- 規則：只有「待處理 (pending)」的訂單才能被會員本人取消，
-- 一旦進入付款/出貨流程就不行，要走客服處理
-- 取消後會自動觸發先前建立的 restore_stock_on_cancel trigger 補回庫存
-- =========================================================

create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_owner uuid;
begin
  select status, user_id into v_status, v_owner
  from public.orders
  where id = p_order_id;

  if v_owner is null then
    raise exception '訂單不存在';
  end if;

  if v_owner is distinct from auth.uid() then
    raise exception '無權限取消此訂單';
  end if;

  if v_status <> 'pending' then
    raise exception '訂單已進入處理流程，無法自行取消，請聯絡客服';
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public;
grant execute on function public.cancel_my_order(uuid) to authenticated;
