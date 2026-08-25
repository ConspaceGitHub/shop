-- =========================================================
-- 擴充植物照顧紀錄 (在 Supabase SQL Editor 執行)
-- 1. 新增備註欄位，讓會員可以寫觀察筆記（不一定要綁一個實際動作）
-- 2. 新增兩種照顧類型：修剪、病蟲害處理
-- =========================================================

alter table public.plant_care_logs add column if not exists note text;

alter table public.plant_care_logs drop constraint if exists plant_care_logs_event_type_check;
alter table public.plant_care_logs add constraint plant_care_logs_event_type_check
  check (event_type in ('watered', 'fertilized', 'repotted', 'pruned', 'pest_control', 'note'));
