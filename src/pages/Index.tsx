import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Star, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeliverySettings, formatTime, isKitchenOpen } from '@/hooks/useDeliverySettings';
import { useMenuItems } from '@/hooks/useMenu';
import MenuItemCard from '@/components/MenuItemCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import heroImage from '@/assets/hero-food.jpg';

const Index = () => {
  const { data: settings, isLoading: settingsLoading } = useDeliverySettings();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  
  const isOpen = isKitchenOpen(settings);
  const popularItems = menuItems?.slice(0, 4) || [];

  if (settingsLoading) {
    return <LoadingSpinner text="Loading..." />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-secondary/40" />
        </div>
        
        <div className="relative container h-full flex flex-col justify-center px-4">
          <div className="max-w-xl animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                isOpen 
                  ? 'bg-success/20 text-success' 
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {isOpen ? 'Kitchen Open' : 'Kitchen Closed'}
              </span>
            </div>
            
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
              <span className="text-primary">Luxe</span> Bite
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 mb-6">
              Authentic Ghanaian cuisine, crafted with love and delivered fresh to your doorstep in Tamale.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 text-white/80">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  {settings ? `${formatTime(settings.opening_time)} - ${formatTime(settings.closing_time)}` : '10 AM - 10 PM'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-sm">Delivering in {settings?.delivery_area || 'Tamale'}</span>
              </div>
            </div>
            
            <Link to="/menu">
              <Button size="lg" className="btn-primary-gradient text-lg px-8">
                Order Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-card border-b border-border">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🍲', title: 'Fresh Daily', desc: 'Made to order' },
              { icon: '🚚', title: 'Fast Delivery', desc: 'Within 45 mins' },
              { icon: '💳', title: 'Easy Pay', desc: 'Mobile Money' },
              { icon: '⭐', title: 'Top Rated', desc: '4.9 stars' },
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <span className="text-4xl mb-2 block">{feature.icon}</span>
                <h3 className="font-display font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Dishes */}
      <section className="py-16 container px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">Popular Dishes</h2>
            <p className="text-muted-foreground mt-1">Most loved by our customers</p>
          </div>
          <Link to="/menu">
            <Button variant="outline" className="hidden md:flex">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        {menuLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
        
        <div className="mt-8 text-center md:hidden">
          <Link to="/menu">
            <Button variant="outline">
              View Full Menu
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-secondary">
        <div className="container px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Hungry? We've Got You Covered
          </h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">
            Order now and enjoy authentic Ghanaian food delivered straight to your location.
          </p>
          <Link to="/menu">
            <Button size="lg" className="btn-primary-gradient">
              Browse Menu
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
