import { Link } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserOrders } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';

const Orders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useUserOrders();

  if (authLoading || ordersLoading) {
    return <LoadingSpinner text="Loading orders..." />;
  }

  if (!user) {
    return (
      <div className="container px-4 py-16 text-center">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Sign in to view orders</h1>
        <p className="text-muted-foreground mb-6">
          Track your orders and view order history
        </p>
        <Link to="/auth">
          <Button className="btn-primary-gradient">
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container px-4 py-16 text-center">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">No orders yet</h1>
        <p className="text-muted-foreground mb-6">
          Your order history will appear here
        </p>
        <Link to="/menu">
          <Button className="btn-primary-gradient">
            Browse Menu
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} to={`/order/${order.id}`}>
            <div className="card-elevated p-4 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-bold">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {order.order_items?.length || 0} item(s)
                </p>
                <p className="font-bold text-primary">
                  GHC {order.total.toFixed(2)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Orders;
