import { useEffect, useRef } from 'react';
import { Package, DollarSign, Clock, CheckCircle, ChevronRight, AlertCircle, RefreshCcw } from 'lucide-react';
import { useAdminOrders } from '@/hooks/useOrders';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

const AdminDashboard = () => {
  const { data: orders, isLoading, error } = useAdminOrders();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelAudioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderCountRef = useRef<number>(0);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  useEffect(() => {
    if (error) {
      console.error('AdminDashboard: Failed to fetch orders:', error);
    }
  }, [error]);

  // Play sound on new order
  useEffect(() => {
    if (orders && orders.length > previousOrderCountRef.current) {
      if (previousOrderCountRef.current > 0) {
        try {
          audioRef.current?.play();
        } catch (e) {
          console.log('Audio play failed:', e);
        }
      }
      previousOrderCountRef.current = orders.length;
    }
  }, [orders]);

  // Play sound when an order is cancelled (from SSE)
  useEffect(() => {
    const handler = () => {
      try {
        cancelAudioRef.current?.play();
      } catch (e) {
        console.log('Cancel audio play failed:', e);
      }
    };
    window.addEventListener('admin-order-cancelled', handler);
    return () => window.removeEventListener('admin-order-cancelled', handler);
  }, []);

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
        <Button onClick={handleRefresh} className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysOrders = orders?.filter(
    (o) => new Date(o.created_at) >= today
  ) || [];

  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const activeOrders = orders?.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  ) || [];
  const completedToday = todaysOrders.filter((o) => o.status === 'delivered');

  const stats = [
    { label: 'Orders Today', value: todaysOrders.length, icon: Package, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'Total Revenue', value: `GHC ${Number(todaysRevenue).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Pending Orders', value: activeOrders.length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Completed Today', value: completedToday.length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div>
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
      <audio ref={cancelAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3" />

      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={item}
            className="card-elevated p-5 lg:p-6 rounded-xl hover:shadow-md transition-shadow duration-200"
          >
            <div className={`inline-flex p-2.5 rounded-lg ${stat.bg} mb-3`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="card-elevated p-4 lg:p-6 rounded-xl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Recent Orders</h2>
            <Link
            to="/admin/orders"
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {activeOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No active orders</p>
        ) : (
          <div className="space-y-2">
            {activeOrders.slice(0, 5).map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-foreground">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <OrderStatusBadge status={order.status} size="sm" />
                  <p className="font-bold text-primary">GHC {Number(order.total).toFixed(2)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
