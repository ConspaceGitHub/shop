import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/useToast';
import AdminHeader from '../../components/AdminHeader';

type DiscountType = 'percentage' | 'fixed';
type CouponType = 'general' | 'birthday' | 'anniversary';

interface CouponRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  coupon_type: CouponType;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

interface FormState {
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  couponType: CouponType;
  startsAt: string;
  endsAt: string;
}

const couponTypeLabel: Record<CouponType, string> = {
  general: '一般',
  birthday: '生日優惠',
  anniversary: '週年慶',
};

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

const emptyForm: FormState = {
  code: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '0',
  couponType: 'general',
  startsAt: toDateInputValue(new Date().toISOString()),
  endsAt: '',
};

function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function fetchCoupons() {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setCoupons(data as CouponRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchCoupons 在儲存後也會被重用，無法整個包進 effect 裡
    fetchCoupons();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function startEdit(coupon: CouponRow) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description ?? '',
      discountType: coupon.discount_type,
      discountValue: String(coupon.discount_value),
      minOrderAmount: String(coupon.min_order_amount),
      couponType: coupon.coupon_type,
      startsAt: toDateInputValue(coupon.starts_at),
      endsAt: coupon.ends_at ? toDateInputValue(coupon.ends_at) : '',
    });
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const discountValue = Number(form.discountValue);
    const minOrderAmount = Number(form.minOrderAmount);

    if (!form.code.trim() || !form.title.trim()) {
      setFormError('請填寫優惠代碼與名稱');
      return;
    }
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      setFormError('折扣值必須是大於 0 的數字');
      return;
    }
    if (form.discountType === 'percentage' && discountValue > 100) {
      setFormError('百分比折扣不能超過 100');
      return;
    }
    if (Number.isNaN(minOrderAmount) || minOrderAmount < 0) {
      setFormError('最低消費金額必須是大於等於 0 的數字');
      return;
    }

    setSaving(true);
    const wasEditing = Boolean(editingId);

    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      discount_type: form.discountType,
      discount_value: discountValue,
      min_order_amount: minOrderAmount,
      coupon_type: form.couponType,
      starts_at: new Date(`${form.startsAt}T00:00:00`).toISOString(),
      ends_at: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
    };

    const { error } = editingId
      ? await supabase.from('coupons').update(payload).eq('id', editingId)
      : await supabase.from('coupons').insert(payload);

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    resetForm();
    await fetchCoupons();
    showToast(wasEditing ? '優惠券已更新' : '優惠券已新增');
  }

  async function toggleActive(coupon: CouponRow) {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);

    if (error) {
      showToast(`更新失敗：${error.message}`, 'error');
    } else {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
      );
      showToast(coupon.is_active ? '優惠券已停用' : '優惠券已啟用');
    }
  }

  async function handleDelete(coupon: CouponRow) {
    if (!confirm(`確定要刪除優惠券「${coupon.title}」嗎？`)) return;
    const { error } = await supabase.from('coupons').delete().eq('id', coupon.id);
    if (error) {
      showToast(`刪除失敗：${error.message}`, 'error');
    } else {
      await fetchCoupons();
      showToast('優惠券已刪除');
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-6 font-display text-xl font-bold text-forest-900">優惠券管理</h1>

        <form onSubmit={handleSubmit} className="mb-10 space-y-4 rounded-lg border border-forest-100 bg-white p-6">
          <h2 className="font-semibold text-forest-900">{editingId ? '編輯優惠券' : '新增優惠券'}</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-forest-700">優惠代碼 *</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                required
                placeholder="例如 ANNIV2026"
                className="w-full rounded-lg border border-forest-200 px-3 py-2 uppercase focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">名稱 *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="例如 週年慶 9 折"
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">優惠類型</label>
              <select
                name="couponType"
                value={form.couponType}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              >
                <option value="general">一般</option>
                <option value="birthday">生日優惠（限會員生日當月）</option>
                <option value="anniversary">週年慶（限時全站）</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">折扣方式</label>
              <select
                name="discountType"
                value={form.discountType}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              >
                <option value="percentage">百分比折扣（%）</option>
                <option value="fixed">固定金額折抵（NT$）</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">
                折扣值 * {form.discountType === 'percentage' ? '(0-100)' : '(NT$)'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                name="discountValue"
                value={form.discountValue}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">最低消費金額</label>
              <input
                type="number"
                min="0"
                step="1"
                name="minOrderAmount"
                value={form.minOrderAmount}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">開始日期</label>
              <input
                type="date"
                name="startsAt"
                value={form.startsAt}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-forest-700">結束日期（留空 = 不限期）</label>
              <input
                type="date"
                name="endsAt"
                value={form.endsAt}
                onChange={handleChange}
                className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">說明</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-forest-700 px-6 py-3 font-semibold text-white transition active:scale-95 hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
            >
              {saving ? '儲存中...' : editingId ? '儲存變更' : '新增優惠券'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-forest-200 px-6 py-3 font-semibold text-forest-700 hover:bg-forest-50"
              >
                取消編輯
              </button>
            )}
          </div>
        </form>

        {loading && <p className="text-center text-forest-500">載入中...</p>}
        {!loading && error && <p className="text-center text-red-500">讀取失敗：{error}</p>}

        {!loading && !error && (
          <div className="space-y-3">
            {coupons.length === 0 && (
              <p className="rounded-xl border border-forest-100 bg-white p-8 text-center text-forest-500">
                還沒有任何優惠券
              </p>
            )}
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-forest-100 bg-white p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-forest-50 px-2 py-0.5 font-mono text-xs text-forest-700">
                      {coupon.code}
                    </span>
                    <span className="text-xs text-forest-400">{couponTypeLabel[coupon.coupon_type]}</span>
                    {!coupon.is_active && (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-500">已停用</span>
                    )}
                  </div>
                  <p className="mt-1 font-semibold text-forest-900">{coupon.title}</p>
                  <p className="text-sm text-forest-500">
                    {coupon.discount_type === 'percentage'
                      ? `折扣 ${coupon.discount_value}%`
                      : `折抵 NT$${coupon.discount_value}`}
                    {coupon.min_order_amount > 0 && ` · 滿 NT$${coupon.min_order_amount} 可用`}
                  </p>
                  <p className="text-xs text-forest-400">
                    {toDateInputValue(coupon.starts_at)} ～ {coupon.ends_at ? toDateInputValue(coupon.ends_at) : '不限期'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(coupon)}
                    className="rounded-lg border border-forest-200 px-4 py-2 text-sm text-forest-700 hover:bg-forest-50"
                  >
                    {coupon.is_active ? '停用' : '啟用'}
                  </button>
                  <button
                    onClick={() => startEdit(coupon)}
                    className="rounded-lg border border-forest-200 px-4 py-2 text-sm text-forest-700 hover:bg-forest-50"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(coupon)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminCouponsPage;
