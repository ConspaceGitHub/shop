import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Header from '../components/Header';

interface FormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  birthday: string;
}

const emptyForm: FormState = { name: '', email: '', password: '', phone: '', birthday: '' };

function SignupPage() {
  const { session, member, loading, signUpMember } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/account';

  if (!loading && session && member) {
    return <Navigate to={from} replace />;
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }

    setSubmitting(true);
    const { error } = await signUpMember(form);
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

      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">加入會員</h1>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-forest-100 bg-white p-6">
          <div>
            <label className="mb-1 block text-sm text-forest-700">姓名 *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">密碼 *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">電話 *</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">生日 *</label>
            <input
              type="date"
              name="birthday"
              value={form.birthday}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-forest-400">生日當月可享生日優惠券</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-forest-700 py-3 font-semibold text-white transition active:scale-95 hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
          >
            {submitting ? '註冊中...' : '註冊'}
          </button>

          <p className="text-center text-sm text-forest-500">
            已經有帳號了？{' '}
            <Link to="/login" className="font-medium text-forest-700 hover:text-forest-900">
              登入
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

export default SignupPage;
