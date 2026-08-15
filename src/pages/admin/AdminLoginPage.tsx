import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

function AdminLoginPage() {
  const { session, role, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session && role === 'admin') {
    return <Navigate to="/admin/orders" replace />;
  }

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

    navigate('/admin/orders');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-forest-100 bg-white p-8"
      >
        <h1 className="text-xl font-bold text-forest-900">業者後台登入</h1>

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
          className="w-full rounded-lg bg-forest-700 py-3 text-white font-semibold transition active:scale-95 hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
        >
          {submitting ? '登入中...' : '登入'}
        </button>
      </form>
    </div>
  );
}

export default AdminLoginPage;
