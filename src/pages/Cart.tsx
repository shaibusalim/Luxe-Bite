import { Link, Navigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import CartItemCard from '@/components/CartItemCard';
import LoadingSpinner from '@/components/LoadingSpinner';

const Cart = () => {
  const { user, isLoading } = useAuth();
  const { items, getSubtotal, clearCart } = useCart();
  const { data: settings } = useDeliverySettings();

  if (isLoading) return <LoadingSpinner text="Loading..." />;
  if (!user) return <Navigate to="/auth" replace state={{ from: '/cart' }} />;
  
  const subtotal = getSubtotal();
  const deliveryFee = settings?.delivery_fee || 10;
  const total = subtotal + (items.length > 0 ? deliveryFee : 0);

  if (items.length === 0) {
    return (
      <div className="container px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Add some delicious dishes from our menu!
          </p>
          <Link to="/menu">
            <Button className="btn-primary-gradient">
              Browse Menu
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Your Cart</h1>
          <p className="text-muted-foreground">{items.length} item(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <CartItemCard key={item.id} item={item} />
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card-elevated p-6 sticky top-24">
            <h2 className="font-display text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">GHC {Number(subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">GHC {Number(deliveryFee).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg text-primary">
                    GHC {Number(total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <Link to="/checkout">
              <Button className="w-full btn-primary-gradient" size="lg">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            
            <Link to="/menu" className="block mt-4">
              <Button variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
