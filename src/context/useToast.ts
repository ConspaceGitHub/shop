import { useContext } from 'react';
import { ToastContext } from './toast-context';

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast 必須在 ToastProvider 裡面使用');
  }
  return context;
}
