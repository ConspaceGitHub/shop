import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Header from '../components/Header';

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await signIn(email, password);

    setSubmitting(false);

    if (error) {
      setError(error);
      return;
    }

    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">會員登入</h1>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-forest-100 bg-white p-6">
          <div>
            <label className="mb-1 block text-sm text-forest-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-forest-700 py-3 font-semibold text-white transition active:scale-95 hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
          >
            {submitting ? '登入中...' : '登入'}
          </button>

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
