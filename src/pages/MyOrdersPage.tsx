import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import Header from '../components/Header';
import AccountSidebar from '../components/AccountSidebar';
import { statusLabel, type OrderRow } from '../types/order';

function MyOrdersPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancellingRef = useRef(false);

  useEffect(() => {
    async function fetchOrders() {
      if (!session) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(id, product_id, quantity, unit_price, products(name))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setOrders(data as unknown as OrderRow[]);
      }
      setLoading(false);
    }

    fetchOrders();
  }, [session]);

  async function handleCancel(orderId: string) {
    if (cancellingRef.current) return;
    if (!confirm('確定要取消這筆訂單嗎？')) return;

    cancellingRef.current = true;
    setCancellingId(orderId);
    setCancelError(null);

    const { error } = await supabase.rpc('cancel_my_order', { p_order_id: orderId });

    cancellingRef.current = false;
    setCancellingId(null);

    if (error) {
      setCancelError(error.message);
      showToast(`取消失敗：${error.message}`, 'error');
      return;
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)));
    showToast('訂單已取消');
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header back={{ to: '/', label: '返回商品列表' }} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">我的訂單</h1>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
          <AccountSidebar />

          <div className="min-w-0">
            {loading && <p className="text-center text-forest-500">載入中...</p>}
            {!loading && error && <p className="text-center text-red-500">讀取訂單失敗：{error}</p>}
            {cancelError && <p className="mb-4 text-center text-sm text-red-500">{cancelError}</p>}

            {!loading && !error && orders.length === 0 && (
              <div className="rounded-xl border border-forest-100 bg-white p-10 text-center">
                <p className="text-forest-500">你還沒有任何訂單</p>
                <Link
                  to="/"
                  className="mt-4 inline-block rounded-xl bg-forest-700 px-6 py-3 font-semibold text-white transition hover:bg-forest-800"
                >
                  去逛逛商品
                </Link>
              </div>
            )}

            {!loading && !error && orders.length > 0 && (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-forest-100 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-forest-400">
                          {new Date(order.created_at).toLocaleString('zh-TW')}
                        </p>
                        <p className="mt-1 text-sm font-medium text-forest-700">
                          {statusLabel[order.status]}
                        </p>
                      </div>
                      <div className="text-right">
                        {order.discount_amount > 0 && (
                          <p className="text-xs text-terracotta-600">
                            {order.coupon_code ? `${order.coupon_code} ` : ''}折抵 -NT$ {order.discount_amount}
                          </p>
                        )}
                        <p className="text-lg font-bold text-forest-900">NT$ {order.total_amount}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 border-t border-forest-50 pt-3">
                      {order.order_items.map((item) =>
                        item.products ? (
                          <Link
                            key={item.id}
                            to={`/products/${item.product_id}`}
                            className="flex justify-between text-sm text-forest-600 transition hover:text-forest-800 hover:underline"
                          >
                            <span>
                              {item.products.name} x {item.quantity}
                            </span>
                            <span>NT$ {item.unit_price * item.quantity}</span>
                          </Link>
                        ) : (
                          <div key={item.id} className="flex justify-between text-sm text-forest-400">
                            <span>(商品已刪除) x {item.quantity}</span>
                            <span>NT$ {item.unit_price * item.quantity}</span>
                          </div>
                        )
                      )}
                    </div>

                    {order.status === 'pending' && (
                      <div className="mt-3 border-t border-forest-50 pt-3 text-right">
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancellingId === order.id}
                          className="text-sm text-red-500 transition hover:text-red-600 disabled:opacity-50"
                        >
                          {cancellingId === order.id ? '取消中...' : '取消訂單'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default MyOrdersPage;
