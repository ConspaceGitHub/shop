import { useContext } from 'react';
import { AdminNotificationsContext } from './adminNotifications-context';

export function useAdminNotifications() {
  const context = useContext(AdminNotificationsContext);
  if (!context) {
    throw new Error('useAdminNotifications 必須在 AdminNotificationsProvider 裡面使用');
  }
  return context;
}
