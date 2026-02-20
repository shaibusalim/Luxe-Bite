import { useParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Phone, MapPin, Clock, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderById, useCancelOrder } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'sonner';

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { data: order, isLoading, refetch } = useOrderById(orderId || '');
  const cancelOrder = useCancelOrder();

  const canCancel = order?.status === 'pending' && user && order?.user_id === user.id;

  const handleCancelOrder = async () => {
    if (!orderId) return;
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder.mutateAsync(orderId);
      toast.success('Order cancelled');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading order..." />;
  }

  if (!order) {
    return (
      <div className="container px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold mb-4">Order not found</h1>
        <Link to="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }

  const paymentMethodLabels: Record<string, string> = {
    mtn: 'MTN Mobile Money',
    vodafone: 'Vodafone Cash',
    airteltigo: 'AirtelTigo Money',
    pay_on_delivery: 'Pay on Delivery',
    paystack: 'Paystack',
  };

  return (
    <div className="container px-4 py-8">
      <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Link>

      <div className="max-w-2xl mx-auto">
        {/* Success Banner */}
        <div className="card-elevated p-6 mb-6 text-center border-success/30 bg-success/5">
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground">
            Thank you for your order. We're preparing your delicious meal!
          </p>
        </div>

        {/* Order Details */}
        <div className="card-elevated p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono font-bold">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{order.customer_phone}</span>
            </div>
            {order.delivery_address && (
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{order.delivery_address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="card-elevated p-6 mb-6">
          <h2 className="font-display text-lg font-bold mb-4">Order Items</h2>
          
          <div className="space-y-3">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.quantity}x {item.item_name}</p>
                  {item.special_instructions && (
                    <p className="text-sm text-muted-foreground">
                      Note: {item.special_instructions}
                    </p>
                  )}
                </div>
                <span className="font-medium">
                  GHC {(Number(item.unit_price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>GHC {Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>GHC {Number(order.delivery_fee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-primary">GHC {Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="card-elevated p-6">
          <h2 className="font-display text-lg font-bold mb-2">Payment</h2>
          <p className="text-muted-foreground">
            {paymentMethodLabels[order.payment_method] || order.payment_method}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {canCancel && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleCancelOrder}
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancel Order
            </Button>
          )}
          <Link to="/menu">
            <Button variant="outline">Order More</Button>
          </Link>
          <Link to="/orders">
            <Button variant="outline">My Orders</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
