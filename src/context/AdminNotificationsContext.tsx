import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { AdminNotificationsContext, type NewOrderNotice } from './adminNotifications-context';

const STORAGE_KEY = 'admin_order_notifications';
const MAX_HISTORY = 30;

function loadStored(): NewOrderNotice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NewOrderNotice[]) : [];
  } catch {
    return [];
  }
}

function saveStored(notifications: NewOrderNotice[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // localStorage 不可用（例如無痕模式限制）就放棄保存，不影響功能
  }
}

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NewOrderNotice[]>(() => loadStored());

  useEffect(() => {
    saveStored(notifications);
  }, [notifications]);

  useEffect(() => {
    if (role !== 'admin') return;

    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const raw = payload.new as { id: string; customer_name: string; total_amount: number };
          const notice: NewOrderNotice = {
            id: raw.id,
            customer_name: raw.customer_name,
            total_amount: raw.total_amount,
            receivedAt: new Date().toISOString(),
            read: false,
          };
          setNotifications((prev) => [notice, ...prev].slice(0, MAX_HISTORY));
          showToast(`🔔 新訂單：${notice.customer_name} · NT$${notice.total_amount}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, showToast]);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AdminNotificationsContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll }}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}
