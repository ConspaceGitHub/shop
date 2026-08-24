import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import Header from '../components/Header';
import AccountSidebar from '../components/AccountSidebar';
import ImagePlaceholder from '../components/ImagePlaceholder';
import { statusLabel, type OrderRow } from '../types/order';
import { isCouponEligibleForMember, isCouponUsableNow, type Coupon } from '../lib/coupons';

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

interface RedeemedCoupon {
  id: string;
  coupon_code: string;
  title: string | null;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number | null;
  redeemed_at: string;
}

function UnverifiedBadge() {
  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-full bg-terracotta-50 px-2 py-0.5 text-xs text-terracotta-600"
      title="目前尚未串接驗證機制，僅供展示"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.166 2.357-1.166 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      未驗證
    </span>
  );
}

function AccountPage() {
  const { session, member, refreshMember } = useAuth();
  const { showToast } = useToast();
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redeemedCoupons, setRedeemedCoupons] = useState<RedeemedCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', birthday: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const savingProfileRef = useRef(false);

  useEffect(() => {
    async function load() {
      if (!session) return;
      setLoading(true);

      const [ordersRes, purchasedRes, productsRes, couponsRes, redemptionsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(id, product_id, quantity, unit_price, products(name))')
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
        supabase
          .from('coupon_redemptions')
          .select('id, coupon_code, title, discount_type, discount_value, redeemed_at')
          .eq('user_id', session.user.id)
          .order('redeemed_at', { ascending: false }),
      ]);

      setCoupons((couponsRes.data as Coupon[]) ?? []);
      setRedeemedCoupons((redemptionsRes.data as RedeemedCoupon[]) ?? []);
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
            imageUrl: images[0]?.image_url ?? null,
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

  const usedCodes = new Set(redeemedCoupons.map((r) => r.coupon_code));
  const eligibleCoupons = coupons.filter(
    (c) => !usedCodes.has(c.code) && isCouponUsableNow(c) && isCouponEligibleForMember(c, member)
  );

  function startEdit() {
    setProfileForm({ name: member!.name, phone: member!.phone, birthday: member!.birthday });
    setProfileError(null);
    setEditing(true);
  }

  function handleProfileChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    if (savingProfileRef.current) return;

    setProfileError(null);

    if (!profileForm.name.trim() || !profileForm.phone.trim() || !profileForm.birthday) {
      setProfileError('姓名、電話、生日都不能空白');
      return;
    }

    savingProfileRef.current = true;
    setSavingProfile(true);

    const { error } = await supabase
      .from('members')
      .update({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        birthday: profileForm.birthday,
      })
      .eq('id', member!.id);

    setSavingProfile(false);
    savingProfileRef.current = false;

    if (error) {
      // 不要把 Supabase/RLS 的原始錯誤內容直接顯示出來
      setProfileError('儲存失敗，請稍後再試');
      return;
    }

    await refreshMember();
    setEditing(false);
    showToast('會員資料已更新');
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header back={{ to: '/', label: '返回商品列表' }} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">會員中心</h1>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
          <AccountSidebar />

          <div className="min-w-0">
            <div className="mb-8 rounded-xl border border-forest-100 bg-white p-6">
              {editing ? (
                <form onSubmit={handleProfileSave} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm text-forest-700">姓名</label>
                    <input
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-forest-700">電話</label>
                    <input
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-forest-700">生日</label>
                    <input
                      type="date"
                      name="birthday"
                      value={profileForm.birthday}
                      onChange={handleProfileChange}
                      className="w-full rounded-lg border border-forest-200 px-3 py-2 focus:border-forest-600 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-forest-400">Email 綁定登入帳號，這裡暫不開放修改。</p>

                  {profileError && <p className="text-sm text-red-500">{profileError}</p>}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:bg-forest-200"
                    >
                      {savingProfile ? '儲存中...' : '儲存'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-lg border border-forest-200 px-4 py-2 text-sm text-forest-700 hover:bg-forest-50"
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg font-semibold text-forest-900">{member.name}</p>
                    <button
                      onClick={startEdit}
                      className="rounded-lg border border-forest-200 px-3 py-1.5 text-sm text-forest-700 hover:bg-forest-50"
                    >
                      編輯資料
                    </button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-forest-600">
                    <p className="flex items-center">
                      Email：{member.email}
                      <UnverifiedBadge />
                    </p>
                    <p className="flex items-center">
                      電話：{member.phone}
                      <UnverifiedBadge />
                    </p>
                    <p>生日：{member.birthday}</p>
                  </div>
                </>
              )}
            </div>

            <section id="coupons" className="mb-8 scroll-mt-24">
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
                    <div
                      key={c.id}
                      className="rounded-xl border border-dashed border-terracotta-400 bg-white p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-forest-50 px-2 py-0.5 font-mono text-xs text-forest-700">
                          {c.code}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-forest-900">{c.title}</p>
                      <p className="text-sm text-terracotta-600">
                        {c.discount_type === 'percentage'
                          ? `折扣 ${c.discount_value}%`
                          : `折抵 NT$${c.discount_value}`}
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

            <section id="used-coupons" className="mb-8 scroll-mt-24">
              <h2 className="mb-3 font-semibold text-forest-900">已使用的優惠券</h2>

              {loading ? (
                <p className="text-forest-500">載入中...</p>
              ) : redeemedCoupons.length === 0 ? (
                <p className="rounded-xl border border-forest-100 bg-white p-6 text-center text-forest-500">
                  還沒有使用過優惠券
                </p>
              ) : (
                <div className="space-y-2">
                  {redeemedCoupons.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border border-forest-100 bg-forest-50/50 p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-white px-2 py-0.5 font-mono text-xs text-forest-500">
                            {r.coupon_code}
                          </span>
                          <span className="text-sm text-forest-700">{r.title ?? '優惠券'}</span>
                        </div>
                        <p className="mt-1 text-xs text-forest-400">
                          {new Date(r.redeemed_at).toLocaleDateString('zh-TW')} 使用
                        </p>
                      </div>
                      {r.discount_type && r.discount_value != null && (
                        <span className="text-sm text-forest-500">
                          {r.discount_type === 'percentage' ? `${r.discount_value}%` : `NT$${r.discount_value}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section id="recent-orders" className="mb-8 scroll-mt-24">
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

            <section id="recommended" className="scroll-mt-24">
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
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-28 w-full object-cover" />
                      ) : (
                        <ImagePlaceholder className="h-28 w-full" />
                      )}
                      <div className="p-2">
                        <p className="truncate text-sm font-medium text-forest-900">{p.name}</p>
                        <p className="text-sm text-terracotta-600">NT$ {p.price}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AccountPage;
