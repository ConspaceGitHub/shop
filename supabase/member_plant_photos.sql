-- =========================================================
-- 會員自訂植物照片 schema (在 Supabase SQL Editor 執行)
-- 讓會員可以幫「自己養的那一株」上傳實拍照片，取代商品的官方照片，
-- 只顯示在自己的「我的植物」頁面，不影響商城上的商品照片
-- =========================================================

-- ---------------------------------------------------------
-- 1. 資料表：每個會員 + 每個商品最多一張自訂照片
-- ---------------------------------------------------------
create table if not exists public.member_plant_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  photo_url text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.member_plant_photos enable row level security;

drop policy if exists member_plant_photos_select_own on public.member_plant_photos;
create policy member_plant_photos_select_own on public.member_plant_photos
  for select using (auth.uid() = user_id);

drop policy if exists member_plant_photos_insert_own on public.member_plant_photos;
create policy member_plant_photos_insert_own on public.member_plant_photos
  for insert with check (auth.uid() = user_id);

drop policy if exists member_plant_photos_update_own on public.member_plant_photos;
create policy member_plant_photos_update_own on public.member_plant_photos
  for update using (auth.uid() = user_id);

drop policy if exists member_plant_photos_delete_own on public.member_plant_photos;
create policy member_plant_photos_delete_own on public.member_plant_photos
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 2. Storage bucket：檔案路徑必須是 {user_id}/... 才能上傳/更新/刪除，
--    確保只有本人能寫入自己資料夾底下的照片
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

drop policy if exists plant_photos_storage_public_read on storage.objects;
create policy plant_photos_storage_public_read on storage.objects
  for select using (bucket_id = 'plant-photos');

drop policy if exists plant_photos_storage_owner_insert on storage.objects;
create policy plant_photos_storage_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists plant_photos_storage_owner_update on storage.objects;
create policy plant_photos_storage_owner_update on storage.objects
  for update using (
    bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists plant_photos_storage_owner_delete on storage.objects;
create policy plant_photos_storage_owner_delete on storage.objects
  for delete using (
    bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
