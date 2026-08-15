import { useContext } from 'react';
import { CartContext } from './cart-context';

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart 必須在 CartProvider 裡面使用');
  }
  return context;
}
