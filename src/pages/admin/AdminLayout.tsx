import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, FolderOpen, Layers, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = () => {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return <LoadingSpinner text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/admin/orders', icon: UtensilsCrossed, label: 'Orders' },
    { href: '/admin/menu', icon: FolderOpen, label: 'Menu' },
    { href: '/admin/categories', icon: Layers, label: 'Categories' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const initial = { opacity: 0, x: -8 };
  const animate = { opacity: 1, x: 0 };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar - collapsible on tablet/mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-out lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <Link to="/admin" className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-sidebar-primary">Luxe</span>
              <span className="font-display text-xl font-bold text-sidebar-foreground">Bite</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item, i) => {
              const isActive = item.exact
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href);
              return (
                <motion.div
                  key={item.href}
                  initial={initial}
                  animate={animate}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border space-y-2">
            <Link to="/" className="block">
              <Button variant="outline" className="w-full justify-start text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                View Store
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main content + top bar */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar: Luxe Bite Admin + avatar + logout */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-card border-b border-border px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-display text-lg font-bold truncate">
              <span className="text-primary">Luxe Bite</span>
              <span className="text-foreground"> Admin</span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Avatar className="h-9 w-9 rounded-full border-2 border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {user?.email?.slice(0, 2).toUpperCase() ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium text-muted-foreground truncate max-w-[140px]">
              {user?.email ?? 'Admin'}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
