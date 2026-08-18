import { Link, Navigate, useLocation } from 'react-router-dom';

interface OrderSummaryItem {
  name: string;
  price: number;
  quantity: number;
}

interface OrderSummaryState {
  orderId: string;
  customerName: string;
  items: OrderSummaryItem[];
  totalPrice: number;
  discountAmount: number;
  finalTotal: number;
}

function OrderSuccessPage() {
  const location = useLocation();
  const summary = location.state as OrderSummaryState | null;

  if (!summary) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-cream">
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mb-4 text-5xl">🌱</div>
        <h1 className="mb-2 font-display text-2xl font-bold text-forest-900">
          訂單成立，謝謝你，{summary.customerName}！
        </h1>
        <p className="mb-8 text-forest-500">訂單編號：{summary.orderId}</p>

        <div className="mb-8 rounded-xl border border-forest-100 bg-white p-6 text-left">
          <div className="space-y-2">
            {summary.items.map((item) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span className="text-forest-600">
                  {item.name} x {item.quantity}
                </span>
                <span className="text-forest-900">NT$ {item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          {summary.discountAmount > 0 && (
            <div className="mt-3 flex justify-between text-sm text-terracotta-600">
              <span>優惠折抵</span>
              <span>-NT$ {summary.discountAmount}</span>
            </div>
          )}

          <div className="mt-4 flex justify-between border-t border-forest-100 pt-4 font-semibold text-forest-900">
            <span>總計</span>
            <span className="text-terracotta-600">NT$ {summary.finalTotal}</span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-block rounded-xl bg-forest-700 px-6 py-3 font-semibold text-white transition active:scale-95 hover:bg-forest-800"
        >
          繼續逛逛
        </Link>
      </main>
    </div>
  );
}

export default OrderSuccessPage;
