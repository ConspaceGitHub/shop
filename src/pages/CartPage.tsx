import { Link } from 'react-router-dom';
import { useCart } from '../context/useCart';
import Header from '../components/Header';

function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream">
        <Header back={{ to: '/', label: '返回商品列表' }} />
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mb-4 text-5xl">🛒</div>
          <p className="text-lg text-forest-500">購物車是空的</p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-xl bg-forest-700 px-6 py-3 font-semibold text-white transition active:scale-95 hover:bg-forest-800"
          >
            去逛逛商品
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header back={{ to: '/', label: '返回商品列表' }} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 font-display text-2xl font-bold text-forest-900">購物車</h1>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 rounded-xl border border-forest-100 bg-white p-4"
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-20 w-20 rounded-lg object-cover"
              />

              <div className="flex-1">
                <h3 className="font-semibold text-forest-900">{item.name}</h3>
                <p className="text-sm text-forest-500">NT$ {item.price}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="h-8 w-8 rounded-full border border-forest-200 text-forest-600 hover:bg-forest-50"
                >
                  −
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                  className="h-8 w-8 rounded-full border border-forest-200 text-forest-600 hover:bg-forest-50 disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <p className="w-20 text-right font-semibold text-forest-900">
                NT$ {item.price * item.quantity}
              </p>

              <button
                onClick={() => removeItem(item.productId)}
                className="text-sm text-terracotta-600 hover:text-terracotta-500"
              >
                移除
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between rounded-xl border border-forest-100 bg-white p-6">
          <span className="text-lg font-semibold text-forest-900">總計</span>
          <span className="text-2xl font-bold text-terracotta-600">NT$ {totalPrice}</span>
        </div>

        <Link
          to="/checkout"
          className="mt-4 block w-full rounded-xl bg-forest-700 py-3 text-center font-semibold text-white transition active:scale-95 hover:bg-forest-800"
        >
          前往結帳
        </Link>
      </main>
    </div>
  );
}

export default CartPage;
