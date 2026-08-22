-- =========================================================
-- 開啟 orders 資料表的即時廣播 (在 Supabase SQL Editor 執行)
-- 讓後台可以訂閱「有新訂單建立」的事件，不用重新整理頁面就能收到通知
-- =========================================================

alter publication supabase_realtime add table public.orders;
