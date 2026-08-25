-- =========================================================
-- 修正商品頁「今天已售出 X 件」的權限漏洞 (在 Supabase SQL Editor 執行)
-- 問題：ProductDetailPage 原本直接查 order_items 加總全站訂單，
-- 但 order_items 的 RLS 只允許會員看到「自己」訂單的明細，
-- 導致一般會員看到的今日銷量永遠是 0（只有 admin 看得到正確數字）。
-- 修法：用 security definer 函式在後端做加總，只回傳一個數字，
-- 不會讓前端讀到其他人訂單的任何細節。
-- =========================================================

create or replace function public.get_today_sold_count(p_product_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(oi.quantity), 0)::integer
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.product_id = p_product_id
    and o.status in ('paid', 'shipped', 'completed')
    and o.created_at >= date_trunc('day', now());
$$;

revoke all on function public.get_today_sold_count(uuid) from public;
grant execute on function public.get_today_sold_count(uuid) to authenticated;
