import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import AuthSubmitButton, { type SubmitState } from '../../components/AuthSubmitButton';

function AdminLoginPage() {
  const { session, role, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitState>('idle');
  const submittingRef = useRef(false);

  // status !== 'idle' 代表正在處理我們自己的登入成功動畫流程，
  // 這時候不要讓這個 guard 搶先跳轉，不然畫面會被瞬間切走，動畫等於白做
  if (!loading && session && role === 'admin' && status === 'idle') {
    return <Navigate to="/admin" replace />;
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
      navigate('/admin');
    }, 500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-sm space-y-4 rounded-lg border border-forest-100 bg-white p-8 transition-all duration-300 ${
          status === 'success' ? 'scale-[1.02] shadow-lg' : ''
        }`}
      >
        <h1 className="text-xl font-bold text-forest-900">業者後台登入</h1>

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
      </form>
    </div>
  );
}

export default AdminLoginPage;
