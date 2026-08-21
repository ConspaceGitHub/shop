import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/useCart';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import {
  computeDiscount,
  isCouponEligibleForMember,
  isCouponUsableNow,
  type Coupon,
} from '../lib/coupons';

function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { session, member } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usedCouponCodes, setUsedCouponCodes] = useState<Set<string>>(new Set());
  const [selectedCouponId, setSelectedCouponId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 會員資料載入後預填表單，屬預期行為
      setForm({ name: member.name, email: member.email, phone: member.phone, address: '' });
    }
  }, [member]);

  useEffect(() => {
    async function fetchCoupons() {
      if (!session) return;

      const [couponsRes, redemptionsRes] = await Promise.all([
        supabase.from('coupons').select('*').eq('is_active', true),
        supabase.from('coupon_redemptions').select('coupon_code').eq('user_id', session.user.id),
      ]);

      setCoupons((couponsRes.data as Coupon[]) ?? []);
      setUsedCouponCodes(
        new Set(((redemptionsRes.data as Array<{ coupon_code: string }>) ?? []).map((r) => r.coupon_code))
      );
    }
    fetchCoupons();
  }, [session]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream">
        <Header back={{ to: '/', label: '返回商品列表' }} />
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <p className="mb-4 text-lg text-forest-500">購物車是空的，無法結帳</p>
          <Link
            to="/"
            className="inline-block rounded-xl bg-forest-700 px-6 py-3 font-semibold text-white transition active:scale-95 hover:bg-forest-800"
          >
            去逛逛商品
          </Link>
        </div>
      </div>
    );
  }

  const eligibleCoupons = coupons.filter(
    (c) =>
      !usedCouponCodes.has(c.code) &&
      isCouponUsableNow(c) &&
      isCouponEligibleForMember(c, member) &&
      totalPrice >= c.min_order_amount
  );

  const selectedCoupon = eligibleCoupons.find((c) => c.id === selectedCouponId) ?? null;
  const discountAmount = selectedCoupon ? computeDiscount(selectedCoupon, totalPrice) : 0;
  const finalTotal = Math.max(0, totalPrice - discountAmount);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!session || !member) {
      setError('請先登入會員才能結帳');
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.address.trim()) {
      setError('請填寫姓名、Email 與收件地址');
      return;
    }

    setSubmitting(true);

    const orderId = crypto.randomUUID();

    const { error: orderError } = await supabase.rpc('place_order', {
      p_order_id: orderId,
      p_user_id: session.user.id,
      p_customer_name: form.name.trim(),
      p_customer_email: form.email.trim(),
      p_customer_phone: form.phone.trim() || null,
      p_shipping_address: form.address.trim(),
      p_coupon_code: selectedCoupon?.code ?? null,
      p_discount_amount: discountAmount,
      p_items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
      })),
    });

    if (orderError) {
      setError(`建立訂單失敗：${orderError.message}`);
      setSubmitting(false);
      return;
    }

    const summary = {
      orderId,
      customerName: form.name.trim(),
      items: items.map((item) => ({ name: item.name, price: item.price, quantity: item.quantity })),
      totalPrice,
      discountAmount,
      finalTotal,
    };

    clearCart();
    navigate('/order-success', { state: summary });
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header back={{ to: '/cart', label: '返回購物車' }} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">結帳</h1>

        <div className="mb-6 rounded-xl border border-forest-100 bg-white p-6">
          <h2 className="mb-4 font-semibold text-forest-900">訂單內容</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-forest-600">
                  {item.name} x {item.quantity}
                </span>
                <span className="text-forest-900">NT$ {item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          {discountAmount > 0 && (
            <div className="mt-3 flex justify-between text-sm text-terracotta-600">
              <span>優惠折抵（{selectedCoupon?.code}）</span>
              <span>-NT$ {discountAmount}</span>
            </div>
          )}

          <div className="mt-4 flex justify-between border-t border-forest-100 pt-4 font-semibold text-forest-900">
            <span>總計</span>
            <span className="text-terracotta-600">NT$ {finalTotal}</span>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-forest-100 bg-white p-6">
          <h2 className="mb-4 font-semibold text-forest-900">優惠券</h2>
          {eligibleCoupons.length === 0 ? (
            <p className="text-sm text-forest-400">目前沒有可使用的優惠券</p>
          ) : (
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-forest-700">
                <input
                  type="radio"
                  name="coupon"
                  checked={selectedCouponId === ''}
                  onChange={() => setSelectedCouponId('')}
                />
                不使用優惠券
              </label>
              {eligibleCoupons.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-forest-700"
                >
                  <input
                    type="radio"
                    name="coupon"
                    checked={selectedCouponId === c.id}
                    onChange={() => setSelectedCouponId(c.id)}
                  />
                  <span className="font-mono text-xs text-forest-500">{c.code}</span>
                  {c.title}
                  <span className="text-terracotta-600">
                    （{c.discount_type === 'percentage' ? `${c.discount_value}% off` : `折抵 NT$${c.discount_value}`}）
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-forest-100 bg-white p-6">
          <h2 className="font-semibold text-forest-900">收件資訊</h2>

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
            <label className="mb-1 block text-sm text-forest-700">電話</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-forest-700">收件地址 *</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              rows={3}
              className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-forest-700 py-3 font-semibold text-white transition active:scale-95 hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
          >
            {submitting ? '送出中...' : '確認送出訂單'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default CheckoutPage;
