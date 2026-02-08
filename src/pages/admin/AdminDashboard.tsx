import { useEffect, useRef } from 'react';
import { Package, DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { useAdminOrders } from '@/hooks/useOrders';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const { data: orders, isLoading } = useAdminOrders();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderCountRef = useRef<number>(0);

  // Play sound on new order
  useEffect(() => {
    if (orders && orders.length > previousOrderCountRef.current) {
      if (previousOrderCountRef.current > 0) {
        // Only play sound if it's not the initial load
        try {
          audioRef.current?.play();
        } catch (e) {
          console.log('Audio play failed:', e);
        }
      }
      previousOrderCountRef.current = orders.length;
    }
  }, [orders?.length]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysOrders = orders?.filter(
    (o) => new Date(o.created_at) >= today
  ) || [];

  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + o.total, 0);
  const activeOrders = orders?.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  ) || [];
  const completedToday = todaysOrders.filter((o) => o.status === 'delivered');

  const stats = [
    {
      label: "Today's Orders",
      value: todaysOrders.length,
      icon: Package,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: "Today's Revenue",
      value: `GHC ${todaysRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Active Orders',
      value: activeOrders.length,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Completed Today',
      value: completedToday.length,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <div>
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
      
      <div className="mb-6">
        <h1 className="font-display text-2xl lg:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card-elevated p-4 lg:p-6">
            <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl lg:text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card-elevated p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Recent Orders</h2>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>

        {activeOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No active orders</p>
        ) : (
          <div className="space-y-3">
            {activeOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-mono text-sm font-bold">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">GHC {order.total.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {order.status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
