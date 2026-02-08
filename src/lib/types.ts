export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_weekend_only: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: MenuCategory;
}

export interface CartItem extends MenuItem {
  quantity: number;
  special_instructions?: string;
}

export interface DeliverySettings {
  id: string;
  delivery_fee: number;
  is_delivery_enabled: boolean;
  is_pay_on_delivery_enabled: boolean;
  min_order_amount: number;
  opening_time: string;
  closing_time: string;
  delivery_area: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  order_type: 'delivery' | 'pickup';
  status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'mtn' | 'vodafone' | 'airteltigo' | 'pay_on_delivery';
  payment_status: 'pending' | 'paid' | 'failed';
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  special_instructions: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  default_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'customer';
}
