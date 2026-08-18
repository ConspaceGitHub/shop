import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const navItems = [
  { to: '/admin/orders', label: '訂單管理' },
  { to: '/admin/products', label: '商品管理' },
  { to: '/admin/coupons', label: '優惠券管理' },
  { to: '/admin/stats', label: '銷售統計' },
];

function AdminHeader() {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <header className="border-b border-forest-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-bold text-forest-900">業者後台</span>
          <nav className="flex items-center gap-5">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
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
        <button onClick={signOut} className="text-sm text-forest-500 hover:text-forest-800">
          登出
        </button>
      </div>
    </header>
  );
}

export default AdminHeader;
