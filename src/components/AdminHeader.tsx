import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useAdminNotifications } from '../context/useAdminNotifications';

const navItems = [
  { to: '/admin', label: '總覽' },
  { to: '/admin/orders', label: '訂單管理' },
  { to: '/admin/products', label: '商品管理' },
  { to: '/admin/coupons', label: '優惠券管理' },
  { to: '/admin/members', label: '會員管理' },
  { to: '/admin/stats', label: '銷售統計' },
];

function AdminHeader() {
  const { signOut } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll } = useAdminNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function toggleOpen() {
    setOpen((prev) => {
      if (!prev) markAllRead();
      return !prev;
    });
  }

  return (
    <header className="relative border-b border-forest-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-bold text-forest-900">業者後台</span>
          <nav className="flex items-center gap-5">
            {navItems.map((item) => {
              const active =
                location.pathname === item.to ||
                (item.to !== '/admin' && location.pathname.startsWith(`${item.to}/`));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm transition ${
                    active ? 'font-semibold text-forest-900' : 'text-forest-500 hover:text-forest-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleOpen}
            className="relative flex items-center gap-1 text-forest-600 transition hover:text-forest-900"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && (
              <span
                key={unreadCount}
                className="animate-badge-pop absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta-500 text-xs font-bold text-white"
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button onClick={signOut} className="text-sm text-forest-500 hover:text-forest-800">
            登出
          </button>
        </div>
      </div>

      {open && (
        <>
          <button
            aria-label="關閉通知"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-6 top-full z-50 mt-2 w-80 rounded-xl border border-forest-100 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-forest-50 px-4 py-3">
              <span className="text-sm font-semibold text-forest-900">新訂單通知</span>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-forest-400 transition hover:text-forest-700"
                >
                  清除紀錄
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-sm text-forest-400">目前沒有通知紀錄</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={`${n.id}-${n.receivedAt}`}
                    onClick={() => {
                      setOpen(false);
                      navigate('/admin/orders');
                    }}
                    className="flex w-full items-center justify-between border-b border-forest-50 px-4 py-3 text-left text-sm transition hover:bg-forest-50"
                  >
                    <div>
                      <p className="text-forest-800">{n.customer_name}</p>
                      <p className="text-xs text-forest-400">
                        {new Date(n.receivedAt).toLocaleString('zh-TW')}
                      </p>
                    </div>
                    <span className="font-medium text-forest-900">NT$ {n.total_amount}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}

export default AdminHeader;
