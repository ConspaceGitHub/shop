import { useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { AdminNotificationsContext, type NewOrderNotice } from './adminNotifications-context';

const STORAGE_KEY = 'admin_order_notifications';
const LAST_CHECKED_KEY = 'admin_order_notifications_last_checked';
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

function loadLastChecked(): string | null {
  try {
    return localStorage.getItem(LAST_CHECKED_KEY);
  } catch {
    return null;
  }
}

function saveLastChecked(iso: string) {
  try {
    localStorage.setItem(LAST_CHECKED_KEY, iso);
  } catch {
    // 同上，忽略即可
  }
}

function mergeNotices(a: NewOrderNotice[], b: NewOrderNotice[]) {
  const byId = new Map<string, NewOrderNotice>();
  for (const n of [...a, ...b]) {
    const existing = byId.get(n.id);
    // 同一筆訂單只留一份；只要任一來源標記為已讀，就視為已讀
    byId.set(n.id, existing ? { ...n, read: existing.read || n.read } : n);
  }
  return Array.from(byId.values())
    .sort((x, y) => new Date(y.receivedAt).getTime() - new Date(x.receivedAt).getTime())
    .slice(0, MAX_HISTORY);
}

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NewOrderNotice[]>(() => loadStored());
  const hasReconciled = useRef(false);

  useEffect(() => {
    saveStored(notifications);
  }, [notifications]);

  // 回頭核對：把「上次確認之後、但這個瀏覽器沒接收到即時通知」的訂單也補回來
  useEffect(() => {
    if (role !== 'admin' || hasReconciled.current) return;
    hasReconciled.current = true;

    async function reconcile() {
      const lastChecked = loadLastChecked();

      if (!lastChecked) {
        // 第一次使用這個功能，不用把過去所有歷史訂單都當成「未讀」，直接從現在開始算
        saveLastChecked(new Date().toISOString());
        return;
      }

      const { data } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, created_at')
        .gt('created_at', lastChecked)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY);

      const missed = ((data as Array<{
        id: string;
        customer_name: string;
        total_amount: number;
        created_at: string;
      }>) ?? []).map((o) => ({
        id: o.id,
        customer_name: o.customer_name,
        total_amount: o.total_amount,
        receivedAt: o.created_at,
        read: false,
      }));

      if (missed.length > 0) {
        setNotifications((prev) => mergeNotices(missed, prev));
      }
    }

    reconcile();
  }, [role]);

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
          setNotifications((prev) => mergeNotices([notice], prev));
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
    saveLastChecked(new Date().toISOString());
  }

  function clearAll() {
    setNotifications([]);
    saveLastChecked(new Date().toISOString());
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AdminNotificationsContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll }}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}
