import { createContext, useContext, useState, type ReactNode } from 'react';

// 購物車裡每一項商品的資料結構
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stock: number; // 用來限制不能加超過庫存
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function addItem(newItem: Omit<CartItem, 'quantity'>, quantity: number = 1) {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === newItem.productId);

      if (existing) {
        // 已經在購物車裡了,增加數量(但不超過庫存)
        const newQuantity = Math.min(existing.quantity + quantity, existing.stock);
        return prev.map((item) =>
          item.productId === newItem.productId
            ? { ...item, quantity: newQuantity }
            : item
        );
      }

      // 新商品,加進購物車
      return [...prev, { ...newItem, quantity: Math.min(quantity, newItem.stock) }];
    });
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item
      )
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

// 自訂 hook,讓其他元件可以方便地使用購物車
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart 必須在 CartProvider 裡面使用');
  }
  return context;
}