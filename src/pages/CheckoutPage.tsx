import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/useCart';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.address.trim()) {
      setError('請填寫姓名、Email 與收件地址');
      return;
    }

    setSubmitting(true);

    const orderId = crypto.randomUUID();

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: form.name.trim(),
      customer_email: form.email.trim(),
      customer_phone: form.phone.trim() || null,
      shipping_address: form.address.trim(),
      total_amount: totalPrice,
    });

    if (orderError) {
      setError(`建立訂單失敗：${orderError.message}`);
      setSubmitting(false);
      return;
    }

    const orderItemsPayload = items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);

    if (itemsError) {
      setError(`建立訂單明細失敗：${itemsError.message}`);
      setSubmitting(false);
      return;
    }

    const summary = {
      orderId,
      customerName: form.name.trim(),
      items: items.map((item) => ({ name: item.name, price: item.price, quantity: item.quantity })),
      totalPrice,
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
          <div className="mt-4 flex justify-between border-t border-forest-100 pt-4 font-semibold text-forest-900">
            <span>總計</span>
            <span className="text-terracotta-600">NT$ {totalPrice}</span>
          </div>
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
