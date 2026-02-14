import { useQuery } from '@tanstack/react-query';

export interface DeliverySettings {
  id: string;
  opening_time: string;
  closing_time: string;
  delivery_area: string;
  minimum_order: number;
  delivery_fee: number;
  is_delivery_enabled?: boolean;
  is_pay_on_delivery_enabled?: boolean;
}

const mockSettings: DeliverySettings = {
  id: '1',
  opening_time: '10:00',
  closing_time: '22:00',
  delivery_area: 'Tamale',
  minimum_order: 20,
  delivery_fee: 5,
};

const normalizeTime = (t: string): string => {
  if (!t) return '10:00';
  const parts = t.split(':');
  return `${parts[0] || '10'}:${parts[1] || '00'}`;
};

export const useDeliverySettings = () => {
  return useQuery({
    queryKey: ['deliverySettings'],
    queryFn: async (): Promise<DeliverySettings> => {
      try {
        const res = await fetch('/api/delivery-settings');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!data) return mockSettings;
        return {
          id: data.id,
          opening_time: normalizeTime(data.opening_time),
          closing_time: normalizeTime(data.closing_time),
          delivery_area: data.delivery_area || 'Tamale',
          minimum_order: Number(data.min_order_amount ?? data.minimum_order ?? 20),
          delivery_fee: Number(data.delivery_fee ?? 5),
          is_delivery_enabled: data.is_delivery_enabled ?? true,
          is_pay_on_delivery_enabled: data.is_pay_on_delivery_enabled ?? true,
        };
      } catch {
        return mockSettings;
      }
    },
  });
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = (time || '').split(':');
  const hour = parseInt(hours, 10) || 10;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  const mins = minutes && minutes !== '00' ? `:${minutes}` : '';
  return `${formattedHour}${mins} ${ampm}`;
};

export const isKitchenOpen = (settings?: DeliverySettings | null): boolean => {
  if (!settings) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [openHours, openMinutes] = settings.opening_time.split(':').map(Number);
  const [closeHours, closeMinutes] = settings.closing_time.split(':').map(Number);

  const openTime = (openHours || 10) * 60 + (openMinutes || 0);
  const closeTime = (closeHours || 22) * 60 + (closeMinutes || 0);

  return currentTime >= openTime && currentTime <= closeTime;
};
