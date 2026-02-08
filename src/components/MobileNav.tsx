import { Link, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingCart, User, LayoutDashboard } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MobileNav = () => {
  const location = useLocation();
  const { getItemCount } = useCart();
  const { user, isAdmin } = useAuth();
  const itemCount = getItemCount();

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/menu', icon: UtensilsCrossed, label: 'Menu' },
    { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: itemCount },
    ...(isAdmin ? [{ href: '/admin', icon: LayoutDashboard, label: 'Admin' }] : []),
    { href: user ? '/orders' : '/auth', icon: User, label: user ? 'Orders' : 'Login' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
