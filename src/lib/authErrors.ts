// 把 Supabase Auth 回傳的原始錯誤訊息轉成使用者看得懂的中文提示，
// 絕對不要把後端/第三方服務的原始錯誤字串直接顯示給使用者
const knownErrors: Array<{ match: string; message: string }> = [
  { match: 'Invalid login credentials', message: '帳號或密碼錯誤，請確認後再試一次' },
  { match: 'Email not confirmed', message: '這個帳號的 Email 尚未完成驗證' },
  { match: 'User already registered', message: '這個 Email 已經被註冊過了' },
  { match: 'Password should be at least', message: '密碼至少需要 6 個字元' },
  { match: 'rate limit', message: '操作過於頻繁，請稍後再試' },
  { match: 'Signups not allowed', message: '目前暫不開放註冊' },
];

export function translateAuthError(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  const matched = knownErrors.find((e) => lower.includes(e.match.toLowerCase()));
  return matched ? matched.message : '發生錯誤，請稍後再試';
}
