import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Order, OrderItem, CartItem } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface CreateOrderData {
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  order_type: 'delivery' | 'pickup';
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'mtn' | 'vodafone' | 'airteltigo' | 'pay_on_delivery' | 'paystack';
  paystack_reference?: string;
  special_instructions?: string;
  items: CartItem[];
}

// Using Vite dev proxy, no need for API base URL

export const useCreateOrder = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (orderData: CreateOrderData): Promise<Order> => {
      const { items, ...orderDetails } = orderData;
      const res = await fetch(`/api/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          ...orderDetails,
          items,
        }),
      });
      if (!res.ok) throw new Error('Failed to create order');
      const order = await res.json();
      return order as Order;
    },
  });
};

export const useUserOrders = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async (): Promise<Order[]> => {
      if (!user) return [];
      const res = await fetch(`/api/orders?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      return data as Order[];
    },
    enabled: !!user,
  });
};

export const useOrderById = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async (): Promise<Order | null> => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      const data = await res.json();
      return data as Order | null;
    },
    enabled: !!orderId,
  });
};

export interface AdminOrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const useAdminOrders = (params?: { page?: number; limit?: number; status?: string }) => {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ['admin-orders', params?.page, params?.limit, params?.status],
    queryFn: async (): Promise<AdminOrdersResponse | Order[]> => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated. Please log in as admin.');
      }
      
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      
      const res = await fetch(`/api/orders?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 401) {
          throw new Error('Session expired or invalid. Please log in again.');
        }
        if (res.status === 403) {
          throw new Error('Access denied. Admin login required.');
        }
        throw new Error(`Failed to fetch orders: ${res.status}`);
      }
      const data = await res.json();
      return data;
    },
    enabled: !!isAdmin && !authLoading,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/orders/stream');
      es.onmessage = () => {
        console.log('Real-time update: invalidating admin-orders');
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      };
      es.onerror = (err) => {
        console.error('SSE Error:', err);
        if (es) es.close();
      };
    } catch (e) {
      console.error('Failed to establish SSE connection:', e);
    }
    
    return () => {
      if (es) es.close();
    };
  }, [queryClient]);

  return query;
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete order');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
};
