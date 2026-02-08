import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  payment_method: 'mtn' | 'vodafone' | 'airteltigo' | 'pay_on_delivery';
  special_instructions?: string;
  items: CartItem[];
}

export const useCreateOrder = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (orderData: CreateOrderData): Promise<Order> => {
      const { items, ...orderDetails } = orderData;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          ...orderDetails,
          user_id: user?.id || null,
          payment_status: orderDetails.payment_method === 'pay_on_delivery' ? 'pending' : 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems: Omit<OrderItem, 'id' | 'created_at'>[] = items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        special_instructions: item.special_instructions || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

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
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user,
  });
};

export const useOrderById = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async (): Promise<Order | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data as Order | null;
    },
    enabled: !!orderId,
  });
};

export const useAdminOrders = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
};
