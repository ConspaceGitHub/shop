export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';

export const statusLabel: Record<OrderStatus, string> = {
  pending: '待處理',
  paid: '已付款',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
};

export const statusOptions: OrderStatus[] = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];

// 進行中 = 已成立但還沒完成的訂單；已完成/已取消各自獨立看
export const inProgressStatuses: OrderStatus[] = ['pending', 'paid', 'shipped'];

export interface OrderItemRow {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: { name: string } | null;
}

export interface OrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  status: OrderStatus;
  total_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  carrier: string | null;
  tracking_number: string | null;
  created_at: string;
  order_items: OrderItemRow[];
}
