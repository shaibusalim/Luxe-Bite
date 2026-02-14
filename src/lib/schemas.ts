import { z } from "zod";

export const OrderStatusEnum = z.enum([
  "pending",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const OrderItemSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  menu_item_id: z.string().nullable(),
  item_name: z.string(),
  quantity: z.number().int().min(1),
  unit_price: z.number().nonnegative(),
  special_instructions: z.string().nullable(),
  created_at: z.string(),
});

export const OrderSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  customer_name: z.string(),
  customer_phone: z.string(),
  delivery_address: z.string().nullable(),
  order_type: z.enum(["delivery", "pickup"]),
  status: OrderStatusEnum,
  subtotal: z.number(),
  delivery_fee: z.number(),
  total: z.number(),
  payment_method: z.enum(["mtn", "vodafone", "airteltigo", "pay_on_delivery", "paystack"]),
  payment_status: z.enum(["pending", "paid", "failed"]).optional(),
  special_instructions: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  order_items: z.array(OrderItemSchema).optional(),
});

export type OrderStatus = z.infer<typeof OrderStatusEnum>;
