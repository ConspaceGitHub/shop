import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/useToast';
import AdminHeader from '../../components/AdminHeader';
import {
  statusLabel,
  statusOptions,
  inProgressStatuses,
  type OrderStatus,
  type OrderRow,
} from '../../types/order';

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'cancelled';

const filterTabs: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

function AdminOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  async function fetchOrders() {
    setLoading(true);

    let query = supabase
      .from('orders')
      .select('*, order_items(id, product_id, quantity, unit_price, products(name))')
      .order('created_at', { ascending: false });

    if (statusFilter === 'in_progress') {
      query = query.in('status', inProgressStatuses);
    } else if (statusFilter === 'completed') {
      query = query.eq('status', 'completed');
    } else if (statusFilter === 'cancelled') {
      query = query.eq('status', 'cancelled');
    }

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setOrders(data as unknown as OrderRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 篩選條件改變時需要重新查詢，屬預期行為
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFrom, dateTo]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      showToast(`更新失敗：${error.message}`, 'error');
    } else {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      showToast(`訂單狀態已更新為「${statusLabel[status]}」`);
    }
    setUpdatingId(null);
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-6 font-display text-xl font-bold text-forest-900">訂單管理</h1>

        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-forest-100 bg-white p-4">
          <div className="flex gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  statusFilter === tab.value
                    ? 'bg-forest-700 text-white'
                    : 'border border-forest-200 text-forest-600 hover:bg-forest-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-forest-600">
            <label>
              從
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="ml-2 rounded-lg border border-forest-200 px-2 py-1.5 focus:border-forest-600 focus:outline-none"
              />
            </label>
            <label>
              到
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ml-2 rounded-lg border border-forest-200 px-2 py-1.5 focus:border-forest-600 focus:outline-none"
              />
            </label>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-forest-400 hover:text-forest-700"
              >
                清除日期
              </button>
            )}
          </div>
        </div>

        {loading && <div className="p-10 text-center text-forest-500">載入訂單中...</div>}
        {!loading && error && <div className="p-10 text-center text-red-500">讀取訂單失敗：{error}</div>}

        {!loading && !error && orders.length === 0 && (
          <p className="rounded-xl border border-forest-100 bg-white p-10 text-center text-forest-500">
            沒有符合條件的訂單
          </p>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-forest-100 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-forest-900">{order.customer_name}</p>
                    <p className="text-sm text-forest-500">
                      {order.customer_email}
                      {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                    </p>
                    <p className="text-sm text-forest-500">{order.shipping_address}</p>
                    <p className="mt-1 text-xs text-forest-400">
                      訂單編號：{order.id} · {new Date(order.created_at).toLocaleString('zh-TW')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="rounded-lg border border-forest-200 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel[s]}
                        </option>
                      ))}
                    </select>
                    <div className="text-right">
                      {order.discount_amount > 0 && (
                        <p className="text-xs text-terracotta-600">
                          {order.coupon_code ? `${order.coupon_code} ` : ''}折抵 -NT$ {order.discount_amount}
                        </p>
                      )}
                      <span className="text-lg font-bold text-forest-900">NT$ {order.total_amount}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1 border-t border-forest-50 pt-4">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-forest-600">
                      <span>
                        {item.products?.name ?? '(商品已刪除)'} x {item.quantity}
                      </span>
                      <span>NT$ {item.unit_price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminOrdersPage;
