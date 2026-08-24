import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';

const navItems = [
  { to: '/account', label: '會員中心' },
  { to: '/orders', label: '我的訂單' },
  { to: '/my-plants', label: '我的植物' },
];

function AccountSidebar() {
  const { session, member } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState({ orderCount: 0, totalSpent: 0, couponsUsed: 0 });

  useEffect(() => {
    async function load() {
      if (!session) return;

      const [ordersRes, redemptionsRes] = await Promise.all([
        supabase.from('orders').select('total_amount, status').eq('user_id', session.user.id),
        supabase
          .from('coupon_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id),
      ]);

      const orders = (ordersRes.data as Array<{ total_amount: number; status: string }>) ?? [];
      setStats({
        orderCount: orders.length,
        totalSpent: orders
          .filter((o) => o.status !== 'cancelled')
          .reduce((sum, o) => sum + o.total_amount, 0),
        couponsUsed: redemptionsRes.count ?? 0,
      });
    }

    load();
  }, [session]);

  if (!member) {
    return null;
  }

  return (
    <aside className="space-y-4 md:sticky md:top-24 md:h-fit">
      <div className="rounded-xl border border-forest-100 bg-white p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 font-display text-2xl font-semibold text-forest-700">
          {member.name.slice(0, 1)}
        </div>
        <p className="mt-3 font-display font-semibold text-forest-900">{member.name}</p>
        <p className="truncate text-xs text-forest-400">{member.email}</p>
      </div>

      <div className="divide-y divide-forest-50 overflow-hidden rounded-xl border border-forest-100 bg-white">
        <Link
          to="/orders"
          className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-forest-50"
        >
          <span className="text-forest-500">累計訂單</span>
          <span className="flex items-center gap-1 font-semibold text-forest-900">
            {stats.orderCount} 筆 <span className="text-forest-300">›</span>
          </span>
        </Link>
        <Link
          to="/orders"
          className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-forest-50"
        >
          <span className="text-forest-500">累計消費</span>
          <span className="flex items-center gap-1 font-semibold text-forest-900">
            NT$ {stats.totalSpent.toLocaleString()} <span className="text-forest-300">›</span>
          </span>
        </Link>
        <Link
          to="/account#used-coupons"
          className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-forest-50"
        >
          <span className="text-forest-500">已用優惠券</span>
          <span className="flex items-center gap-1 font-semibold text-forest-900">
            {stats.couponsUsed} 張 <span className="text-forest-300">›</span>
          </span>
        </Link>
      </div>

      <nav className="space-y-1 rounded-xl border border-forest-100 bg-white p-2">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                active ? 'bg-forest-50 font-semibold text-forest-900' : 'text-forest-600 hover:bg-forest-50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default AccountSidebar;
