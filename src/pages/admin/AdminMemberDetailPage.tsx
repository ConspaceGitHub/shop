import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminHeader from '../../components/AdminHeader';
import { statusLabel, type OrderStatus } from '../../types/order';

interface MemberInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthday: string;
  created_at: string;
}

interface OrderItemDetail {
  quantity: number;
  unit_price: number;
  products: { name: string; care_difficulty: string | null } | null;
}

interface OrderDetail {
  id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  order_items: OrderItemDetail[];
}

interface Redemption {
  id: string;
  coupon_code: string;
  title: string | null;
  redeemed_at: string;
}

interface Breakdown {
  label: string;
  count: number;
}

const difficultyLabel: Record<string, string> = { easy: '容易', medium: '中等', hard: '困難' };
const timePeriodOrder = ['凌晨', '上午', '下午', '晚上'];
const seasonOrder = ['春季', '夏季', '秋季', '冬季'];

function getTimePeriod(date: Date) {
  const hour = date.getHours();
  if (hour < 6) return '凌晨';
  if (hour < 12) return '上午';
  if (hour < 18) return '下午';
  return '晚上';
}

function getSeason(date: Date) {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return '春季';
  if (month >= 6 && month <= 8) return '夏季';
  if (month >= 9 && month <= 11) return '秋季';
  return '冬季';
}

function sortByFixedOrder(breakdown: Breakdown[], order: string[]) {
  return [...breakdown].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

function BreakdownBars({ data, accentLabel }: { data: Breakdown[]; accentLabel: string | null }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span
            className={`w-14 shrink-0 text-sm ${
              d.label === accentLabel ? 'font-semibold text-forest-900' : 'text-forest-500'
            }`}
          >
            {d.label}
          </span>
          <div className="h-4 flex-1 rounded bg-forest-50">
            <div
              className={`h-full rounded ${d.label === accentLabel ? 'bg-forest-600' : 'bg-forest-300'}`}
              style={{ width: `${Math.max(3, (d.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm text-forest-500">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function AdminMemberDetailPage() {
  const { id } = useParams();
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);

      const [memberRes, ordersRes, redemptionsRes] = await Promise.all([
        supabase.from('members').select('id, name, email, phone, birthday, created_at').eq('id', id).single(),
        supabase
          .from('orders')
          .select(
            'id, status, total_amount, created_at, order_items(quantity, unit_price, products(name, care_difficulty))'
          )
          .eq('user_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('coupon_redemptions')
          .select('id, coupon_code, title, redeemed_at')
          .eq('user_id', id)
          .order('redeemed_at', { ascending: false }),
      ]);

      if (memberRes.error) {
        setError(memberRes.error.message);
      } else {
        setMember(memberRes.data as MemberInfo);
        setOrders((ordersRes.data as unknown as OrderDetail[]) ?? []);
        setRedemptions((redemptionsRes.data as Redemption[]) ?? []);
      }
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <AdminHeader />
        <p className="p-10 text-center text-forest-500">載入中...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-cream">
        <AdminHeader />
        <p className="p-10 text-center text-red-500">讀取失敗：{error ?? '找不到這位會員'}</p>
      </div>
    );
  }

  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const orderCount = orders.length;
  const totalSpent = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const avgOrderValue = validOrders.length > 0 ? Math.round(totalSpent / validOrders.length) : 0;

  const productMap = new Map<string, number>();
  const difficultyMap = new Map<string, number>();
  for (const order of validOrders) {
    for (const item of order.order_items) {
      const name = item.products?.name ?? '(商品已刪除)';
      productMap.set(name, (productMap.get(name) ?? 0) + item.quantity);

      const difficulty = item.products?.care_difficulty;
      if (difficulty) {
        const label = difficultyLabel[difficulty] ?? difficulty;
        difficultyMap.set(label, (difficultyMap.get(label) ?? 0) + item.quantity);
      }
    }
  }
  const topProducts = Array.from(productMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const difficultyBreakdown = sortByFixedOrder(
    Array.from(difficultyMap.entries()).map(([label, count]) => ({ label, count })),
    Object.values(difficultyLabel)
  );
  const topDifficulty =
    difficultyBreakdown.length > 0
      ? difficultyBreakdown.reduce((a, b) => (b.count > a.count ? b : a)).label
      : null;

  const timeMap = new Map<string, number>();
  const seasonMap = new Map<string, number>();
  for (const order of validOrders) {
    const date = new Date(order.created_at);
    const period = getTimePeriod(date);
    const season = getSeason(date);
    timeMap.set(period, (timeMap.get(period) ?? 0) + 1);
    seasonMap.set(season, (seasonMap.get(season) ?? 0) + 1);
  }
  const timeBreakdown = sortByFixedOrder(
    timePeriodOrder.map((label) => ({ label, count: timeMap.get(label) ?? 0 })),
    timePeriodOrder
  );
  const seasonBreakdown = sortByFixedOrder(
    seasonOrder.map((label) => ({ label, count: seasonMap.get(label) ?? 0 })),
    seasonOrder
  );
  const topTime =
    validOrders.length > 0 ? timeBreakdown.reduce((a, b) => (b.count > a.count ? b : a)).label : null;
  const topSeason =
    validOrders.length > 0 ? seasonBreakdown.reduce((a, b) => (b.count > a.count ? b : a)).label : null;

  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link to="/admin/members" className="mb-4 inline-block text-sm text-forest-500 hover:text-forest-700">
          ← 返回會員列表
        </Link>

        <div className="mb-8 rounded-xl border border-forest-100 bg-white p-6">
          <h1 className="font-display text-2xl font-bold text-forest-900">{member.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-forest-600">
            <p>Email：{member.email}</p>
            <p>電話：{member.phone}</p>
            <p>生日：{member.birthday}</p>
            <p>加入日期：{new Date(member.created_at).toLocaleDateString('zh-TW')}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-forest-100 bg-white p-5">
            <p className="text-sm text-forest-500">累計訂單</p>
            <p className="mt-2 text-2xl font-semibold text-forest-900">{orderCount} 筆</p>
          </div>
          <div className="rounded-xl border border-forest-100 bg-white p-5">
            <p className="text-sm text-forest-500">累計消費</p>
            <p className="mt-2 text-2xl font-semibold text-forest-900">NT$ {totalSpent.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-forest-100 bg-white p-5">
            <p className="text-sm text-forest-500">平均客單價</p>
            <p className="mt-2 text-2xl font-semibold text-forest-900">NT$ {avgOrderValue.toLocaleString()}</p>
          </div>
        </div>

        {validOrders.length === 0 ? (
          <p className="mb-8 rounded-xl border border-forest-100 bg-white p-8 text-center text-forest-500">
            這位會員還沒有成立的訂單，暫時看不出購買偏好
          </p>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <section className="rounded-xl border border-forest-100 bg-white p-5">
              <h2 className="mb-4 font-semibold text-forest-900">最常購買的商品</h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-forest-400">沒有資料</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => (
                    <div key={p.label} className="flex items-center justify-between text-sm">
                      <span className="text-forest-700">
                        {i + 1}. {p.label}
                      </span>
                      <span className="font-medium text-forest-900">{p.count} 件</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-forest-100 bg-white p-5">
              <h2 className="mb-4 font-semibold text-forest-900">
                偏好照顧難度{topDifficulty && <span className="text-terracotta-600">：{topDifficulty}</span>}
              </h2>
              {difficultyBreakdown.length === 0 ? (
                <p className="text-sm text-forest-400">沒有資料</p>
              ) : (
                <BreakdownBars data={difficultyBreakdown} accentLabel={topDifficulty} />
              )}
            </section>

            <section className="rounded-xl border border-forest-100 bg-white p-5">
              <h2 className="mb-4 font-semibold text-forest-900">
                常下單時段{topTime && <span className="text-terracotta-600">：{topTime}</span>}
              </h2>
              <BreakdownBars data={timeBreakdown} accentLabel={topTime} />
            </section>

            <section className="rounded-xl border border-forest-100 bg-white p-5">
              <h2 className="mb-4 font-semibold text-forest-900">
                常下單季節{topSeason && <span className="text-terracotta-600">：{topSeason}</span>}
              </h2>
              <BreakdownBars data={seasonBreakdown} accentLabel={topSeason} />
            </section>
          </div>
        )}

        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-forest-900">已使用的優惠券</h2>
          {redemptions.length === 0 ? (
            <p className="rounded-xl border border-forest-100 bg-white p-6 text-center text-forest-500">
              還沒有使用過優惠券
            </p>
          ) : (
            <div className="space-y-2">
              {redemptions.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-forest-100 bg-white p-4 text-sm">
                  <span className="text-forest-700">
                    <span className="mr-2 rounded bg-forest-50 px-2 py-0.5 font-mono text-xs text-forest-700">
                      {r.coupon_code}
                    </span>
                    {r.title ?? '優惠券'}
                  </span>
                  <span className="text-forest-400">{new Date(r.redeemed_at).toLocaleDateString('zh-TW')}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold text-forest-900">訂單紀錄</h2>
          {orders.length === 0 ? (
            <p className="rounded-xl border border-forest-100 bg-white p-6 text-center text-forest-500">
              還沒有任何訂單
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-forest-100 bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-forest-500">
                      {new Date(order.created_at).toLocaleString('zh-TW')} · {statusLabel[order.status]}
                    </span>
                    <span className="font-semibold text-forest-900">NT$ {order.total_amount}</span>
                  </div>
                  <div className="mt-2 space-y-1 border-t border-forest-50 pt-2">
                    {order.order_items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm text-forest-600">
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
        </section>
      </main>
    </div>
  );
}

export default AdminMemberDetailPage;
