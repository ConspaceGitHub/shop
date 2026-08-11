import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-800">
              ← 返回商品列表
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-lg text-gray-500">購物車是空的</p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-3 text-white font-semibold hover:bg-gray-700"
          >
            去逛逛商品
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-800">
            ← 返回商品列表
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">購物車</h1>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-20 w-20 rounded-md object-cover"
              />

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-500">NT$ {item.price}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  −
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                  className="h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <p className="w-20 text-right font-semibold text-gray-900">
                NT$ {item.price * item.quantity}
              </p>

              <button
                onClick={() => removeItem(item.productId)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                移除
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between rounded-lg bg-white p-6 border border-gray-200">
          <span className="text-lg font-semibold text-gray-900">總計</span>
          <span className="text-2xl font-bold text-gray-900">NT$ {totalPrice}</span>
        </div>

        <Link
          to="/checkout"
          className="mt-4 block w-full rounded-lg bg-gray-900 py-3 text-center text-white font-semibold hover:bg-gray-700"
        >
          前往結帳
        </Link>
      </main>
    </div>
  );
}

export default CartPage;