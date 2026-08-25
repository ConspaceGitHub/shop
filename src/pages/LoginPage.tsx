import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Header from '../components/Header';
import AuthSubmitButton, { type SubmitState } from '../components/AuthSubmitButton';

function LoginPage() {
  const { session, member, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitState>('idle');
  const submittingRef = useRef(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/account';

  // 已經是登入狀態（例如登入完成後，會員資料才剛查詢完成）就直接離開登入頁，
  // 避免卡在這裡動不了；但如果正在跑我們自己的成功動畫流程（status !== 'idle'）
  // 就不要讓這個 guard 搶先跳轉，不然動畫還沒播完畫面就被切走了
  if (!loading && session && member && status === 'idle') {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // ref 是同步更新的，就算按鈕被連續點擊好幾次，也只有第一次會真的送出請求
    if (submittingRef.current) return;
    submittingRef.current = true;

    setError(null);
    setStatus('submitting');

    const { error } = await signIn(email, password);

    if (error) {
      setError(error);
      setStatus('idle');
      submittingRef.current = false;
      return;
    }

    setStatus('success');
    window.setTimeout(() => {
      navigate(from, { replace: true });
    }, 500);
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header minimal />

      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">會員登入</h1>

        <form
          onSubmit={handleSubmit}
          className={`space-y-4 rounded-xl border border-forest-100 bg-white p-6 transition-all duration-300 ${
            status === 'success' ? 'scale-[1.02] shadow-lg' : ''
          }`}
        >
          <div>
            <label className="mb-1 block text-sm text-forest-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status !== 'idle'}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none disabled:bg-forest-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={status !== 'idle'}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none disabled:bg-forest-50"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <AuthSubmitButton state={status} idleLabel="登入" submittingLabel="登入中..." successLabel="登入成功" />

          <p className="text-center text-sm text-forest-500">
            還不是會員？{' '}
            <Link to="/signup" className="font-medium text-forest-700 hover:text-forest-900">
              加入會員
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

export default LoginPage;
