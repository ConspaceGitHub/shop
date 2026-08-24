-- =========================================================
-- 訂單物流追蹤欄位 (在 Supabase SQL Editor 執行)
-- 讓管理員把出貨後的物流公司/追蹤單號填進訂單，會員可以在自己的訂單頁看到並查詢
-- =========================================================

alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists tracking_number text;
