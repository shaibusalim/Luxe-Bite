import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MapPin, Phone, User, CreditCard, Truck, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { useCreateOrder } from '@/hooks/useOrders';
import { toast } from 'sonner';

const checkoutSchema = z.object({
  customer_name: z.string().min(2, 'Name is required').max(100),
  customer_phone: z.string().min(10, 'Valid phone number required').max(15),
  delivery_address: z.string().optional(),
  order_type: z.enum(['delivery', 'pickup']),
  payment_method: z.enum(['mtn', 'vodafone', 'airteltigo', 'pay_on_delivery']),
  special_instructions: z.string().max(500).optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { data: settings } = useDeliverySettings();
  const createOrder = useCreateOrder();
  
  const subtotal = getSubtotal();
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const deliveryFee = orderType === 'delivery' ? (settings?.delivery_fee || 10) : 0;
  const total = subtotal + deliveryFee;

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      delivery_address: '',
      order_type: 'delivery',
      payment_method: 'mtn',
      special_instructions: '',
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        delivery_address: data.delivery_address,
        order_type: data.order_type,
        payment_method: data.payment_method,
        special_instructions: data.special_instructions,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        items,
      });
      
      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order/${order.id}`);
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Please try again.');
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container px-4 py-6">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Details */}
              <div className="card-elevated p-6">
                <h2 className="font-display text-xl font-bold mb-4">Contact Details</h2>
                
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Full Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="customer_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="0XX XXX XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Order Type */}
              <div className="card-elevated p-6">
                <h2 className="font-display text-xl font-bold mb-4">Order Type</h2>
                
                <FormField
                  control={form.control}
                  name="order_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(value: 'delivery' | 'pickup') => {
                            field.onChange(value);
                            setOrderType(value);
                          }}
                          className="grid grid-cols-2 gap-4"
                        >
                          <Label
                            htmlFor="delivery"
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value === 'delivery'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <RadioGroupItem value="delivery" id="delivery" />
                            <Truck className="h-5 w-5" />
                            <div>
                              <p className="font-semibold">Delivery</p>
                              <p className="text-xs text-muted-foreground">
                                GHC {settings?.delivery_fee?.toFixed(2) || '10.00'}
                              </p>
                            </div>
                          </Label>
                          
                          <Label
                            htmlFor="pickup"
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value === 'pickup'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <RadioGroupItem value="pickup" id="pickup" />
                            <Package className="h-5 w-5" />
                            <div>
                              <p className="font-semibold">Pickup</p>
                              <p className="text-xs text-muted-foreground">Free</p>
                            </div>
                          </Label>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {orderType === 'delivery' && (
                  <FormField
                    control={form.control}
                    name="delivery_address"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Delivery Address
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your delivery address in Tamale"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Payment Method */}
              <div className="card-elevated p-6">
                <h2 className="font-display text-xl font-bold mb-4">Payment Method</h2>
                
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="space-y-3"
                        >
                          {[
                            { value: 'mtn', label: 'MTN Mobile Money', color: 'bg-yellow-500' },
                            { value: 'vodafone', label: 'Vodafone Cash', color: 'bg-red-500' },
                            { value: 'airteltigo', label: 'AirtelTigo Money', color: 'bg-blue-500' },
                            ...(settings?.is_pay_on_delivery_enabled
                              ? [{ value: 'pay_on_delivery', label: 'Pay on Delivery', color: 'bg-green-500' }]
                              : []),
                          ].map((method) => (
                            <Label
                              key={method.value}
                              htmlFor={method.value}
                              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                field.value === method.value
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <RadioGroupItem value={method.value} id={method.value} />
                              <div className={`h-4 w-4 rounded-full ${method.color}`} />
                              <span className="font-medium">{method.label}</span>
                            </Label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Special Instructions */}
              <div className="card-elevated p-6">
                <FormField
                  control={form.control}
                  name="special_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requests for your order?"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-primary-gradient lg:hidden"
                size="lg"
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  `Place Order • GHC ${total.toFixed(2)}`
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="card-elevated p-6 sticky top-24">
            <h2 className="font-display text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">
                    GHC {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">GHC {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">GHC {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg text-primary">
                    GHC {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={form.handleSubmit(onSubmit)}
              className="w-full btn-primary-gradient mt-6 hidden lg:flex"
              size="lg"
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
