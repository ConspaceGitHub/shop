-- =========================================================
-- 建立商品圖片的 Storage bucket + 權限 (在 Supabase SQL Editor 執行)
-- bucket 設成 public：圖片網址任何人都能直接讀取（一般商品圖不需要保密）
-- 只有 admin 可以上傳/更新/刪除
-- =========================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_storage_public_read on storage.objects;
create policy product_images_storage_public_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_storage_admin_insert on storage.objects;
create policy product_images_storage_admin_insert on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_storage_admin_update on storage.objects;
create policy product_images_storage_admin_update on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_storage_admin_delete on storage.objects;
create policy product_images_storage_admin_delete on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());
