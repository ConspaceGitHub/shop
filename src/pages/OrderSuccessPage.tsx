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
}

function OrderSuccessPage() {
  const location = useLocation();
  const summary = location.state as OrderSummaryState | null;

  if (!summary) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mb-4 text-5xl">🌱</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          訂單成立，謝謝你，{summary.customerName}！
        </h1>
        <p className="mb-8 text-gray-500">訂單編號：{summary.orderId}</p>

        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 text-left">
          <div className="space-y-2">
            {summary.items.map((item) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.name} x {item.quantity}
                </span>
                <span className="text-gray-900">NT$ {item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold text-gray-900">
            <span>總計</span>
            <span>NT$ {summary.totalPrice}</span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-white font-semibold hover:bg-gray-700"
        >
          繼續逛逛
        </Link>
      </main>
    </div>
  );
}

export default OrderSuccessPage;
