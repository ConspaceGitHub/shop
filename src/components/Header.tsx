import { Link } from 'react-router-dom';
import { useCart } from '../context/useCart';
import { useAuth } from '../context/useAuth';

interface HeaderProps {
  back?: { to: string; label: string };
}

function Header({ back }: HeaderProps) {
  const { totalItems } = useCart();
  const { member, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-forest-100 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          {back && (
            <Link
              to={back.to}
              className="rounded-lg border border-forest-100 bg-forest-50 px-3 py-1.5 text-xs text-forest-600 transition hover:bg-forest-100 hover:text-forest-800"
            >
              ← {back.label}
            </Link>
          )}

          <div className="flex items-center gap-6">
            <Link to="/" className="font-display text-xl font-semibold tracking-tight text-forest-800">
              🌿 南都植意塊根多肉
            </Link>
            <Link
              to="/about"
              className="hidden text-sm text-forest-600 transition hover:text-forest-800 sm:inline"
            >
              關於我們
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {member ? (
            <div className="hidden items-center gap-4 sm:flex">
              <Link to="/orders" className="text-sm text-forest-600 transition hover:text-forest-800">
                我的訂單
              </Link>
              <span className="text-sm text-forest-500">{member.name} 你好</span>
              <button onClick={signOut} className="text-sm text-forest-500 transition hover:text-forest-700">
                登出
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-4 sm:flex">
              <Link to="/login" className="text-sm text-forest-600 transition hover:text-forest-800">
                登入
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-forest-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-forest-800"
              >
                加入會員
              </Link>
            </div>
          )}

          <Link to="/cart" className="relative flex items-center gap-1.5 text-forest-700 transition hover:text-forest-900">
            <span className="text-lg">🛒</span>
            <span className="hidden text-sm font-medium sm:inline">購物車</span>
            {totalItems > 0 && (
              <span
                key={totalItems}
                className="animate-badge-pop absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta-500 text-xs font-bold text-white"
              >
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
