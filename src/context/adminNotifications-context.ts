import { createContext } from 'react';

export interface NewOrderNotice {
  id: string;
  customer_name: string;
  total_amount: number;
  receivedAt: string;
  read: boolean;
}

export interface AdminNotificationsContextType {
  notifications: NewOrderNotice[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
}

export const AdminNotificationsContext = createContext<AdminNotificationsContextType | undefined>(
  undefined
);
