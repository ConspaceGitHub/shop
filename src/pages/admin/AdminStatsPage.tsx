import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminHeader from '../../components/AdminHeader';

// 「銷售額」只計入已成立的訂單：已付款/已出貨/已完成，排除待處理與已取消
const SALE_STATUSES = ['paid', 'shipped', 'completed'];

interface QuarterStat {
  quarter: number;
  revenue: number;
}

interface ProductStat {
  name: string;
  revenue: number;
  quantity: number;
}

function AdminStatsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [quarterStats, setQuarterStats] = useState<QuarterStat[]>([]);
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    setError(null);

    const yearStart = `${year}-01-01T00:00:00`;
    const yearEnd = `${year + 1}-01-01T00:00:00`;

    const [ordersRes, itemsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', SALE_STATUSES)
        .gte('created_at', yearStart)
        .lt('created_at', yearEnd),
      supabase
        .from('order_items')
        .select('quantity, unit_price, products(name), orders!inner(status, created_at)')
        .in('orders.status', SALE_STATUSES)
        .gte('orders.created_at', yearStart)
        .lt('orders.created_at', yearEnd),
    ]);

    if (ordersRes.error) {
      setError(ordersRes.error.message);
      setLoading(false);
      return;
    }
    if (itemsRes.error) {
      setError(itemsRes.error.message);
      setLoading(false);
      return;
    }

    const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const order of ordersRes.data ?? []) {
      const month = new Date(order.created_at).getMonth();
      const quarter = Math.floor(month / 3) + 1;
      buckets[quarter] += Number(order.total_amount);
    }
    setQuarterStats([1, 2, 3, 4].map((q) => ({ quarter: q, revenue: buckets[q] })));
    setOrderCount(ordersRes.data?.length ?? 0);

    const items = (itemsRes.data ?? []) as unknown as Array<{
      quantity: number;
      unit_price: number;
      products: { name: string } | null;
    }>;

    const productMap = new Map<string, ProductStat>();
    for (const item of items) {
      const name = item.products?.name ?? '(商品已刪除)';
      const revenue = item.quantity * item.unit_price;
      const existing = productMap.get(name);
      if (existing) {
        existing.revenue += revenue;
        existing.quantity += item.quantity;
      } else {
        productMap.set(name, { name, revenue, quantity: item.quantity });
      }
    }
    setProductStats(Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue));

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 年份改變時需要重新查詢，屬預期行為
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const totalRevenue = useMemo(() => quarterStats.reduce((sum, q) => sum + q.revenue, 0), [quarterStats]);
  const maxQuarterRevenue = useMemo(
    () => Math.max(1, ...quarterStats.map((q) => q.revenue)),
    [quarterStats]
  );
  const topProducts = productStats.slice(0, 10);
  const maxProductRevenue = useMemo(
    () => Math.max(1, ...topProducts.map((p) => p.revenue)),
    [topProducts]
  );
  const avgOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-forest-900">銷售統計</h1>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="rounded-lg border border-forest-200 px-2 py-1 text-forest-600 hover:bg-forest-50"
            >
              ← 上一年
            </button>
            <span className="font-semibold text-forest-900">{year} 年</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="rounded-lg border border-forest-200 px-2 py-1 text-forest-600 hover:bg-forest-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              下一年 →
            </button>
          </div>
        </div>

        {loading && <p className="p-10 text-center text-forest-500">載入統計中...</p>}
        {!loading && error && <p className="p-10 text-center text-red-500">讀取失敗：{error}</p>}

        {!loading && !error && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-forest-100 bg-white p-5">
                <p className="text-sm text-forest-500">{year} 年總營收</p>
                <p className="mt-2 text-2xl font-semibold text-forest-900">
                  NT$ {totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-forest-100 bg-white p-5">
                <p className="text-sm text-forest-500">{year} 年成立訂單數</p>
                <p className="mt-2 text-2xl font-semibold text-forest-900">{orderCount.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-forest-100 bg-white p-5">
                <p className="text-sm text-forest-500">平均客單價</p>
                <p className="mt-2 text-2xl font-semibold text-forest-900">
                  NT$ {avgOrderValue.toLocaleString()}
                </p>
              </div>
            </div>

            <section className="mb-10 rounded-xl border border-forest-100 bg-white p-6">
              <h2 className="mb-6 font-semibold text-forest-900">季度營收</h2>

              <div className="flex items-end gap-6 border-b border-forest-200 pb-0" style={{ height: 200 }}>
                {quarterStats.map((q) => {
                  const heightPx = q.revenue > 0 ? Math.max(4, (q.revenue / maxQuarterRevenue) * 168) : 0;
                  return (
                    <div key={q.quarter} className="flex flex-1 flex-col items-center justify-end gap-2">
                      {q.revenue > 0 && (
                        <span className="text-xs font-medium text-forest-700">
                          NT${q.revenue.toLocaleString()}
                        </span>
                      )}
                      <div
                        className="w-full max-w-14 rounded-t bg-forest-600"
                        style={{ height: heightPx }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-6">
                {quarterStats.map((q) => (
                  <span key={q.quarter} className="flex-1 pt-2 text-center text-xs text-forest-400">
                    第 {q.quarter} 季
                  </span>
                ))}
              </div>

              <table className="mt-6 w-full text-sm">
                <thead>
                  <tr className="border-b border-forest-100 text-left text-forest-400">
                    <th className="pb-2 font-normal">季度</th>
                    <th className="pb-2 text-right font-normal">營收</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterStats.map((q) => (
                    <tr key={q.quarter} className="border-b border-forest-50">
                      <td className="py-1.5 text-forest-700">第 {q.quarter} 季</td>
                      <td className="py-1.5 text-right font-medium text-forest-900">
                        NT$ {q.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-forest-100 bg-white p-6">
              <h2 className="mb-6 font-semibold text-forest-900">品種銷售排行（依營收，{year} 年）</h2>

              {topProducts.length === 0 ? (
                <p className="text-forest-500">此年度尚無已成立訂單資料</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, idx) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-sm text-forest-400">{idx + 1}</span>
                      <span className="w-32 shrink-0 truncate text-sm text-forest-700" title={p.name}>
                        {p.name}
                      </span>
                      <div className="h-6 flex-1 rounded bg-forest-50">
                        <div
                          className="h-full rounded bg-forest-600"
                          style={{ width: `${Math.max(3, (p.revenue / maxProductRevenue) * 100)}%` }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-sm font-medium text-forest-900">
                        NT$ {p.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {productStats.length > 0 && (
                <table className="mt-8 w-full text-sm">
                  <thead>
                    <tr className="border-b border-forest-100 text-left text-forest-400">
                      <th className="pb-2 font-normal">品種</th>
                      <th className="pb-2 text-right font-normal">銷售數量</th>
                      <th className="pb-2 text-right font-normal">營收</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productStats.map((p) => (
                      <tr key={p.name} className="border-b border-forest-50">
                        <td className="py-1.5 text-forest-700">{p.name}</td>
                        <td className="py-1.5 text-right text-forest-700">{p.quantity}</td>
                        <td className="py-1.5 text-right font-medium text-forest-900">
                          NT$ {p.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminStatsPage;
