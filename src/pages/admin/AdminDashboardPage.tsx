import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminHeader from '../../components/AdminHeader';
import { statusLabel, type OrderStatus } from '../../types/order';

const LOW_STOCK_THRESHOLD = 5;
const SALE_STATUSES = ['paid', 'shipped', 'completed'];

interface RecentOrder {
  id: string;
  customer_name: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
}

interface RecentMember {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        pendingRes,
        todayRes,
        monthOrdersRes,
        membersCountRes,
        lowStockRes,
        recentOrdersRes,
        recentMembersRes,
      ] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart),
        supabase
          .from('orders')
          .select('total_amount, status')
          .in('status', SALE_STATUSES)
          .gte('created_at', monthStart),
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase
          .from('products')
          .select('id, name, stock')
          .lte('stock', LOW_STOCK_THRESHOLD)
          .order('stock', { ascending: true })
          .limit(8),
        supabase
          .from('orders')
          .select('id, customer_name, status, total_amount, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('members')
          .select('id, name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setPendingCount(pendingRes.count ?? 0);
      setTodayCount(todayRes.count ?? 0);
      setMonthRevenue(
        ((monthOrdersRes.data as Array<{ total_amount: number }>) ?? []).reduce(
          (sum, o) => sum + o.total_amount,
          0
        )
      );
      setMemberCount(membersCountRes.count ?? 0);
      setLowStockProducts((lowStockRes.data as LowStockProduct[]) ?? []);
      setRecentOrders((recentOrdersRes.data as RecentOrder[]) ?? []);
      setRecentMembers((recentMembersRes.data as RecentMember[]) ?? []);

      setLoading(false);
    }

    load();
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-6 font-display text-xl font-bold text-forest-900">總覽</h1>

        {loading ? (
          <p className="text-center text-forest-500">載入中...</p>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/admin/orders"
                className="rounded-xl border border-forest-100 bg-white p-5 transition hover:shadow-md"
              >
                <p className="text-sm text-forest-500">待處理訂單</p>
                <p className="mt-2 text-2xl font-semibold text-terracotta-600">{pendingCount}</p>
              </Link>
              <Link
                to="/admin/orders"
                className="rounded-xl border border-forest-100 bg-white p-5 transition hover:shadow-md"
              >
                <p className="text-sm text-forest-500">今日訂單</p>
                <p className="mt-2 text-2xl font-semibold text-forest-900">{todayCount}</p>
              </Link>
              <Link
                to="/admin/stats"
                className="rounded-xl border border-forest-100 bg-white p-5 transition hover:shadow-md"
              >
                <p className="text-sm text-forest-500">本月營收</p>
                <p className="mt-2 text-2xl font-semibold text-forest-900">
                  NT$ {monthRevenue.toLocaleString()}
                </p>
              </Link>
              <div className="rounded-xl border border-forest-100 bg-white p-5">
                <p className="text-sm text-forest-500">會員數</p>
                <p className="mt-2 text-2xl font-semibold text-forest-900">{memberCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-forest-900">低庫存商品</h2>
                  <Link to="/admin/products" className="text-sm text-forest-600 hover:text-forest-800">
                    商品管理 →
                  </Link>
                </div>

                {lowStockProducts.length === 0 ? (
                  <p className="rounded-xl border border-forest-100 bg-white p-6 text-center text-forest-500">
                    目前沒有庫存偏低的商品
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lowStockProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-terracotta-400/40 bg-white p-4"
                      >
                        <span className="text-sm text-forest-800">{p.name}</span>
                        <span
                          className={`text-sm font-semibold ${
                            p.stock === 0 ? 'text-red-600' : 'text-terracotta-600'
                          }`}
                        >
                          剩 {p.stock} 件
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-forest-900">最新訂單</h2>
                  <Link to="/admin/orders" className="text-sm text-forest-600 hover:text-forest-800">
                    訂單管理 →
                  </Link>
                </div>

                {recentOrders.length === 0 ? (
                  <p className="rounded-xl border border-forest-100 bg-white p-6 text-center text-forest-500">
                    還沒有訂單
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-xl border border-forest-100 bg-white p-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-forest-800">{order.customer_name}</p>
                          <p className="text-xs text-forest-400">
                            {new Date(order.created_at).toLocaleString('zh-TW')} ·{' '}
                            {statusLabel[order.status]}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-forest-900">
                          NT$ {order.total_amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="mt-8">
              <h2 className="mb-3 font-semibold text-forest-900">最新會員</h2>

              {recentMembers.length === 0 ? (
                <p className="rounded-xl border border-forest-100 bg-white p-6 text-center text-forest-500">
                  還沒有會員註冊
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {recentMembers.map((m) => (
                    <div key={m.id} className="rounded-xl border border-forest-100 bg-white p-4">
                      <p className="text-sm font-medium text-forest-800">{m.name}</p>
                      <p className="text-xs text-forest-400">{m.email}</p>
                      <p className="mt-1 text-xs text-forest-400">
                        {new Date(m.created_at).toLocaleDateString('zh-TW')} 加入
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminDashboardPage;
