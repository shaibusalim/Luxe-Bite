import { Order } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Clock, Package, Truck, CheckCircle, XCircle, ChefHat } from 'lucide-react';

interface OrderStatusBadgeProps {
  status: Order['status'];
  size?: 'sm' | 'md';
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'status-pending',
  },
  preparing: {
    label: 'Preparing',
    icon: ChefHat,
    className: 'status-preparing',
  },
  ready: {
    label: 'Ready',
    icon: Package,
    className: 'status-ready',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    icon: Truck,
    className: 'status-out-for-delivery',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    className: 'status-delivered',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'status-cancelled',
  },
};

const OrderStatusBadge = ({ status, size = 'md' }: OrderStatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {config.label}
    </span>
  );
};

export default OrderStatusBadge;
