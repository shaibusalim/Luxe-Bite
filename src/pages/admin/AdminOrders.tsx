import { useState, useMemo } from 'react';
import { 
  Bell, 
  Eye, 
  RefreshCw, 
  MapPin, 
  ShoppingBag, 
  Phone, 
  User, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminOrders, useUpdateOrderStatus, useDeleteOrder, AdminOrdersResponse } from '@/hooks/useOrders';
import { Order } from '@/lib/types';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const statusOptions: { value: Order['status']; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const NEW_ORDER_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const AdminOrders = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data, isLoading, refetch, error, isFetching } = useAdminOrders({ 
    page: currentPage, 
    limit: pageSize, 
    status: statusFilter 
  });
  
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const { orders, total, totalPages } = useMemo(() => {
    if (!data) return { orders: [], total: 0, totalPages: 0 };
    
    if ('data' in data) {
      const response = data as AdminOrdersResponse;
      return {
        orders: response.data,
        total: response.total,
        totalPages: response.totalPages
      };
    }
    
    const arrayData = data as Order[];
    return {
      orders: arrayData,
      total: arrayData.length,
      totalPages: Math.ceil(arrayData.length / pageSize)
    };
  }, [data, pageSize]);

  const isNewOrder = (order: Order) => {
    const age = Date.now() - new Date(order.created_at).getTime();
    return order.status === 'pending' && age < NEW_ORDER_THRESHOLD_MS;
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
      toast.success('Order status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await deleteOrder.mutateAsync(orderToDelete);
      toast.success('Order deleted successfully');
      setOrderToDelete(null);
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Failed to load orders</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {error instanceof Error ? error.message : 'An unexpected error occurred while fetching orders.'}
        </p>
        <Button onClick={() => refetch()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-0.5">{total} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[180px] bg-card">
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
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()} 
            className={`shrink-0 ${isFetching ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Info</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {orders.map((order) => (
                    <motion.tr 
                      key={order.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`group hover:bg-muted/30 transition-colors ${isNewOrder(order) ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {isNewOrder(order) && (
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-foreground">#{order.id.slice(0, 8)}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, h:mm a')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-foreground">{order.customer_name}</div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customer_phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          {order.order_type === 'delivery' ? (
                            <MapPin className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          <span className="capitalize">{order.order_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={order.status}
                          onValueChange={(val) => handleStatusChange(order.id, val as Order['status'])}
                        >
                          <SelectTrigger className="h-8 w-[140px] bg-transparent border-none p-0 focus:ring-0">
                            <OrderStatusBadge status={order.status} />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <OrderStatusBadge status={opt.value} />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold">GHC {Number(order.total).toFixed(2)}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{order.payment_method}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOrderToDelete(order.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="px-6 py-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <Select value={pageSize.toString()} onValueChange={(v) => {
                  setPageSize(parseInt(v));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>
              <div className="hidden sm:block border-l h-4" />
              <span>
                Showing <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, total)}</span> of <span className="font-medium text-foreground">{total}</span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center px-2">
                <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order Details
              {selectedOrder && <OrderStatusBadge status={selectedOrder.status} />}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer Information</h4>
                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedOrder.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedOrder.customer_phone}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Order Information</h4>
                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Order ID:</span>
                        <span className="font-mono text-xs">{selectedOrder.id}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{format(new Date(selectedOrder.created_at), 'MMMM d, yyyy h:mm a')}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="capitalize">{selectedOrder.order_type}</span>
                      </div>
                      {selectedOrder.delivery_address && (
                        <div className="pt-2 border-t mt-2">
                          <span className="text-muted-foreground text-xs uppercase block mb-1">Delivery Address:</span>
                          <span className="text-sm flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                            {selectedOrder.delivery_address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Order Items</h4>
                    <div className="bg-muted/30 rounded-lg border overflow-hidden">
                      <div className="max-h-[200px] overflow-y-auto divide-y">
                        {selectedOrder.order_items?.map((item) => (
                          <div key={item.id} className="p-3 flex items-start justify-between gap-4 text-sm">
                            <div className="flex-1">
                              <div className="font-medium">{item.item_name}</div>
                              <div className="text-muted-foreground text-xs">Qty: {item.quantity} × GHC {Number(item.unit_price).toFixed(2)}</div>
                              {item.special_instructions && (
                                <div className="text-xs text-amber-600 mt-0.5 italic">"{item.special_instructions}"</div>
                              )}
                            </div>
                            <div className="font-semibold">GHC {(item.quantity * Number(item.unit_price)).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-muted/50 border-t space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>GHC {Number(selectedOrder.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(selectedOrder.delivery_fee) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Delivery Fee:</span>
                            <span>GHC {Number(selectedOrder.delivery_fee).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-bold pt-1 border-t mt-1">
                          <span>Total:</span>
                          <span className="text-primary">GHC {Number(selectedOrder.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment</h4>
                    <div className="bg-muted/30 p-3 rounded-lg border space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Method:</span>
                        <span className="uppercase font-medium">{selectedOrder.payment_method}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`capitalize font-medium ${selectedOrder.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {selectedOrder.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.special_instructions && (
                <div className="pt-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Order Notes</h4>
                  <div className="bg-amber-50/50 border border-amber-200 p-3 rounded-lg text-sm italic">
                    {selectedOrder.special_instructions}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the order from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminOrders;
