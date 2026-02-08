import { useState } from 'react';
import { Bell, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { Order } from '@/lib/types';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusOptions: { value: Order['status']; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const AdminOrders = () => {
  const { data: orders, isLoading, refetch } = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = orders?.filter((order) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return !['delivered', 'cancelled'].includes(order.status);
    return order.status === statusFilter;
  }) || [];

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
      toast.success('Order status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">{orders?.length || 0} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="card-elevated p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-mono font-bold">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <OrderStatusBadge status={order.status} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.customer_name} • {order.customer_phone}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <p className="font-bold text-primary">GHC {order.total.toFixed(2)}</p>
                  
                  <Select
                    value={order.status}
                    onValueChange={(value: Order['status']) => handleStatusChange(order.id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <OrderStatusBadge status={selectedOrder.status} />
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedOrder.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-2">Customer</h3>
                <p>{selectedOrder.customer_name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customer_phone}</p>
                {selectedOrder.delivery_address && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedOrder.delivery_address}
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span>{item.quantity}x {item.item_name}</span>
                        {item.special_instructions && (
                          <p className="text-xs text-muted-foreground">
                            Note: {item.special_instructions}
                          </p>
                        )}
                      </div>
                      <span>GHC {(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.special_instructions && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.special_instructions}
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">GHC {selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
