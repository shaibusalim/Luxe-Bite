import { createContext, useContext, useCallback, useState, useRef, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export type AdminNotification = {
  id: string;
  type: 'order_cancelled';
  order_id: string;
  customer_name: string;
  customer_phone?: string;
  total: number;
  createdAt: number;
  read?: boolean;
};

type AdminNotificationContextValue = {
  notifications: AdminNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AdminNotification, 'id' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
};

const AdminNotificationContext = createContext<AdminNotificationContextValue | null>(null);

const MAX_NOTIFICATIONS = 50;

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const idRef = useRef(0);
  const queryClient = useQueryClient();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((payload: Omit<AdminNotification, 'id' | 'createdAt'>) => {
    const id = `notif-${Date.now()}-${idRef.current++}`;
    setNotifications((prev) => {
      const next = [{ ...payload, id, createdAt: Date.now(), read: false }, ...prev];
      return next.slice(0, MAX_NOTIFICATIONS);
    });
    if (payload.type === 'order_cancelled') {
      const orderId = payload.order_id ? `#${String(payload.order_id).slice(0, 8).toUpperCase()}` : '';
      toast.error('Order cancelled', {
        description: `${payload.customer_name} cancelled order ${orderId} • GHC ${Number(payload.total).toFixed(2)}`,
        duration: 8000,
        action: { label: 'View orders', onClick: () => (window.location.href = '/admin/orders') },
      });
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        const mapped: AdminNotification[] = data.map((n: any) => ({
          id: n.id,
          type: 'order_cancelled',
          order_id: n.order_id ?? '',
          customer_name: n.customer_name ?? 'Customer',
          customer_phone: n.customer_phone ?? undefined,
          total: typeof n.total === 'number' ? n.total : Number(n.total ?? 0) || 0,
          createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
          read: !!n.read,
        }));
        setNotifications(mapped.slice(0, MAX_NOTIFICATIONS));
      } catch {
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ order_id: string; customer_name?: string; customer_phone?: string; total?: number }>;
      const d = ev.detail;
      if (!d) return;
      addNotification({
        type: 'order_cancelled',
        order_id: d.order_id ?? '',
        customer_name: d.customer_name ?? 'Customer',
        customer_phone: d.customer_phone,
        total: typeof d.total === 'number' ? d.total : 0,
      });
    };
    window.addEventListener('admin-order-cancelled', handler);
    return () => window.removeEventListener('admin-order-cancelled', handler);
  }, [addNotification]);

  // SSE: connect when admin is in app so we receive order_cancelled on any admin page
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/orders/stream');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data || '{}');
          if (data.type === 'order_cancelled') {
            window.dispatchEvent(new CustomEvent('admin-order-cancelled', { detail: data }));
          }
        } catch (_) {
          /* ignore */
        }
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      };
      es.onerror = () => {
        if (es) es.close();
      };
    } catch (_) {
      /* ignore */
    }
    return () => {
      if (es) es.close();
    };
  }, [queryClient]);

  const value: AdminNotificationContextValue = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead: (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      fetch(`/api/admin/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      }).catch(() => {});
    },
    markAllAsRead: () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      fetch('/api/admin/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      }).catch(() => {});
    },
    clearAll: () => {
      setNotifications([]);
      fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      }).catch(() => {});
    },
  };

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  const ctx = useContext(AdminNotificationContext);
  return ctx;
}
