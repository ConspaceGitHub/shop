-- 把一個已經在 Supabase Auth 建立好的帳號升級成管理員 (role = 'admin')
-- 使用方式：把 'REPLACE_WITH_EMAIL' 換成該帳號的 email，在 SQL Editor 執行
update public.profiles
set role = 'admin'
where email = 'REPLACE_WITH_EMAIL';
