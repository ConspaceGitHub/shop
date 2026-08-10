-- 把一個已經在 Supabase Auth 建立好的帳號升級成管理員 (role = 'admin')
-- 用 upsert：不管 profiles 裡有沒有這筆資料都能正確設定
-- 使用方式：把 'REPLACE_WITH_EMAIL' 換成該帳號的 email，在 SQL Editor 執行
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where email = 'REPLACE_WITH_EMAIL'
on conflict (id) do update set role = 'admin';
