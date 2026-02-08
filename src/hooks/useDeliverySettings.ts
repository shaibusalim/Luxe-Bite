import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DeliverySettings } from '@/lib/types';

export const useDeliverySettings = () => {
  return useQuery({
    queryKey: ['delivery-settings'],
    queryFn: async (): Promise<DeliverySettings> => {
      const { data, error } = await supabase
        .from('delivery_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return {
          id: '',
          delivery_fee: 10,
          is_delivery_enabled: true,
          is_pay_on_delivery_enabled: true,
          min_order_amount: 0,
          opening_time: '10:00:00',
          closing_time: '22:00:00',
          delivery_area: 'Tamale',
          updated_at: new Date().toISOString(),
        };
      }

      return data as DeliverySettings;
    },
  });
};

export const isKitchenOpen = (settings: DeliverySettings | undefined): boolean => {
  if (!settings) return false;
  
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 8);
  
  return currentTime >= settings.opening_time && currentTime <= settings.closing_time;
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};
