import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Header from '../components/Header';
import AuthSubmitButton, { type SubmitState } from '../components/AuthSubmitButton';

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
  const [status, setStatus] = useState<SubmitState>('idle');
  const submittingRef = useRef(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/account';

  if (!loading && session && member && status === 'idle') {
    return <Navigate to={from} replace />;
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;

    setError(null);

    if (form.password.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }

    submittingRef.current = true;
    setStatus('submitting');

    const { error } = await signUpMember(form);

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
      <Header />

      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">加入會員</h1>

        <form
          onSubmit={handleSubmit}
          className={`space-y-4 rounded-xl border border-forest-100 bg-white p-6 transition-all duration-300 ${
            status === 'success' ? 'scale-[1.02] shadow-lg' : ''
          }`}
        >
          <div>
            <label className="mb-1 block text-sm text-forest-700">姓名 *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={status !== 'idle'}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none disabled:bg-forest-50"
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
              disabled={status !== 'idle'}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none disabled:bg-forest-50"
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
              disabled={status !== 'idle'}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none disabled:bg-forest-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">電話 *</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              disabled={status !== 'idle'}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none disabled:bg-forest-50"
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
              disabled={status !== 'idle'}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none disabled:bg-forest-50"
            />
            <p className="mt-1 text-xs text-forest-400">生日當月可享生日優惠券</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <AuthSubmitButton state={status} idleLabel="註冊" submittingLabel="註冊中..." successLabel="註冊成功" />

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
