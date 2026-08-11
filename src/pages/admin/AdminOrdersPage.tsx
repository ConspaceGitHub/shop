import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';

interface OrderItemRow {
  id: string;
  quantity: number;
  unit_price: number;
  products: { name: string } | null;
}

interface OrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  order_items: OrderItemRow[];
}

const statusLabel: Record<OrderStatus, string> = {
  pending: '待處理',
  paid: '已付款',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
};

const statusOptions: OrderStatus[] = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];

function AdminOrdersPage() {
  const { signOut } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, unit_price, products(name))')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setOrders(data as unknown as OrderRow[]);
    }
    setLoading(false);
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    }
    setUpdatingId(null);
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-500">載入訂單中...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">讀取訂單失敗：{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <h1 className="text-xl font-bold text-gray-900">訂單管理</h1>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800">
            登出
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {orders.length === 0 ? (
          <p className="text-gray-500">目前沒有訂單</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{order.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      {order.customer_email}
                      {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                    </p>
                    <p className="text-sm text-gray-500">{order.shipping_address}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      訂單編號：{order.id} · {new Date(order.created_at).toLocaleString('zh-TW')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel[s]}
                        </option>
                      ))}
                    </select>
                    <span className="text-lg font-bold text-gray-900">NT$ {order.total_amount}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-1 border-t border-gray-100 pt-4">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-600">
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
