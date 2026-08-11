import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="mb-4 text-lg text-gray-500">購物車是空的，無法結帳</p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-white font-semibold hover:bg-gray-700"
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <Link to="/cart" className="text-sm text-gray-500 hover:text-gray-800">
            ← 返回購物車
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">結帳</h1>

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-gray-900">訂單內容</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.name} x {item.quantity}
                </span>
                <span className="text-gray-900">NT$ {item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold text-gray-900">
            <span>總計</span>
            <span>NT$ {totalPrice}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">收件資訊</h2>

          <div>
            <label className="mb-1 block text-sm text-gray-700">姓名 *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">電話</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">收件地址 *</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 py-3 text-white font-semibold transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? '送出中...' : '確認送出訂單'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default CheckoutPage;
