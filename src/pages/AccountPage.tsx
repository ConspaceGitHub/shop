import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import Header from '../components/Header';
import { PLACEHOLDER_IMAGE } from '../lib/placeholderImage';
import { statusLabel, type OrderRow } from '../types/order';
import { isCouponEligibleForMember, isCouponUsableNow, type Coupon } from '../lib/coupons';

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

function AccountPage() {
  const { session, member } = useAuth();
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session) return;
      setLoading(true);

      const [ordersRes, purchasedRes, productsRes, couponsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(id, quantity, unit_price, products(name))')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('orders').select('order_items(product_id)').eq('user_id', session.user.id),
        supabase
          .from('products')
          .select('id, name, price, stock, product_images(image_url, display_order)')
          .gt('stock', 0)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('coupons').select('*').eq('is_active', true),
      ]);

      setCoupons((couponsRes.data as Coupon[]) ?? []);

      setRecentOrders((ordersRes.data as unknown as OrderRow[]) ?? []);

      const purchasedIds = new Set<string>();
      const purchasedOrders =
        (purchasedRes.data as unknown as Array<{ order_items: { product_id: string }[] }>) ?? [];
      for (const order of purchasedOrders) {
        for (const item of order.order_items ?? []) {
          purchasedIds.add(item.product_id);
        }
      }

      const products =
        (productsRes.data as unknown as Array<{
          id: string;
          name: string;
          price: number;
          product_images: { image_url: string; display_order: number }[];
        }>) ?? [];

      const notPurchased = products.filter((p) => !purchasedIds.has(p.id)).slice(0, 4);

      setRecommended(
        notPurchased.map((p) => {
          const images = (p.product_images ?? [])
            .slice()
            .sort((a, b) => a.display_order - b.display_order);
          return {
            id: p.id,
            name: p.name,
            price: p.price,
            imageUrl: images[0]?.image_url ?? PLACEHOLDER_IMAGE,
          };
        })
      );

      setLoading(false);
    }

    load();
  }, [session]);

  if (!member) {
    return null;
  }

  const eligibleCoupons = coupons.filter(
    (c) => isCouponUsableNow(c) && isCouponEligibleForMember(c, member)
  );

  return (
    <div className="min-h-screen bg-cream">
      <Header back={{ to: '/', label: '返回商品列表' }} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">會員中心</h1>

        <div className="mb-8 rounded-xl border border-forest-100 bg-white p-6">
          <p className="font-display text-lg font-semibold text-forest-900">{member.name}</p>
          <div className="mt-3 space-y-1 text-sm text-forest-600">
            <p>Email：{member.email}</p>
            <p>電話：{member.phone}</p>
            <p>生日：{member.birthday}</p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 font-semibold text-forest-900">現有的優惠券</h2>

          {loading ? (
            <p className="text-forest-500">載入中...</p>
          ) : eligibleCoupons.length === 0 ? (
            <p className="rounded-xl border border-forest-100 bg-white p-6 text-center text-forest-500">
              目前沒有可使用的優惠券
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {eligibleCoupons.map((c) => (
                <div key={c.id} className="rounded-xl border border-dashed border-terracotta-400 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-forest-50 px-2 py-0.5 font-mono text-xs text-forest-700">
                      {c.code}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-forest-900">{c.title}</p>
                  <p className="text-sm text-terracotta-600">
                    {c.discount_type === 'percentage' ? `折扣 ${c.discount_value}%` : `折抵 NT$${c.discount_value}`}
                  </p>
                  {c.min_order_amount > 0 && (
                    <p className="mt-1 text-xs text-forest-400">滿 NT$ {c.min_order_amount} 可用</p>
                  )}
                  {c.ends_at && (
                    <p className="text-xs text-forest-400">
                      使用期限至 {new Date(c.ends_at).toLocaleDateString('zh-TW')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-forest-900">最近訂單</h2>
            <Link to="/orders" className="text-sm text-forest-600 hover:text-forest-800">
              查看全部 →
            </Link>
          </div>

          {loading ? (
            <p className="text-forest-500">載入中...</p>
          ) : recentOrders.length === 0 ? (
            <p className="rounded-xl border border-forest-100 bg-white p-6 text-center text-forest-500">
              還沒有任何訂單
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-forest-100 bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-forest-500">
                      {new Date(order.created_at).toLocaleDateString('zh-TW')} ·{' '}
                      {statusLabel[order.status]}
                    </span>
                    <span className="font-semibold text-forest-900">NT$ {order.total_amount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold text-forest-900">你可能也喜歡</h2>

          {!loading && recommended.length === 0 ? (
            <p className="text-sm text-forest-400">沒有更多推薦了</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {recommended.map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  className="block overflow-hidden rounded-xl border border-forest-100 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <img src={p.imageUrl} alt={p.name} className="h-28 w-full object-cover" />
                  <div className="p-2">
                    <p className="truncate text-sm font-medium text-forest-900">{p.name}</p>
                    <p className="text-sm text-terracotta-600">NT$ {p.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AccountPage;
