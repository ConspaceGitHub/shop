import { Link } from 'react-router-dom';
import { useCart } from '../context/useCart';

interface HeaderProps {
  back?: { to: string; label: string };
}

function Header({ back }: HeaderProps) {
  const { totalItems } = useCart();

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
    </header>
  );
}

export default Header;
