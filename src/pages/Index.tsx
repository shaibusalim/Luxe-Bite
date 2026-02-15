import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  MapPin,
  ChefHat,
  Truck,
  CreditCard,
  Star,
  UtensilsCrossed,
  Package,
  Phone,
  MessageCircle,
  Instagram,
  Facebook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeliverySettings, formatTime, isKitchenOpen } from '@/hooks/useDeliverySettings';
import { useMenuItems } from '@/hooks/useMenu';
import { useAddToCart } from '@/hooks/useAddToCart';
import MenuItemCard from '@/components/MenuItemCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { HeroSlider } from '@/components/HeroSlider';
import { ScrollReveal } from '@/components/ScrollReveal';

const TESTIMONIALS = [
  {
    text: 'The jollof rice is incredible! Ordered twice this week. Fast delivery and always fresh.',
    rating: 5,
    name: 'Ama K.',
  },
  {
    text: 'Best Ghanaian food in Tamale. The banku and tilapia hit different. Highly recommend!',
    rating: 5,
    name: 'Kwame M.',
  },
  {
    text: 'Easy ordering, fair prices, and food arrives hot. Luxe Bite is my go-to now.',
    rating: 5,
    name: 'Fatima S.',
  },
];

const Index = () => {
  const { data: settings, isLoading: settingsLoading } = useDeliverySettings();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const addToCart = useAddToCart();

  const isOpen = isKitchenOpen(settings);
  const popularItems = (() => {
    const items = menuItems || [];
    const popular = items.filter((item) => item.is_popular);
    return (popular.length > 0 ? popular : items).slice(0, 4);
  })();

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading delicious things..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] md:min-h-[85vh] overflow-hidden">
        <HeroSlider />

        <div className="relative h-full flex flex-col justify-end pb-10 md:justify-center md:pb-0 px-5 md:px-8 lg:px-12">
          <div className="max-w-xl">
            <motion.div
              className="flex items-center gap-3 mb-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-full">
                <ChefHat className="h-5 w-5 text-primary" />
                <span
                  className={`status-badge ${isOpen ? 'status-badge-open' : 'status-badge-closed'}`}
                >
                  {isOpen ? '● Open Now' : '● Closed'}
                </span>
              </div>
            </motion.div>

            <motion.h1
              className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="text-primary">Luxe</span> Bite — Authentic Ghanaian Flavors, Delivered
            </motion.h1>

            <motion.p
              className="text-base md:text-lg text-white/90 mb-5 leading-relaxed max-w-md"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Fresh, homemade dishes crafted with love. Order now and taste the difference.
            </motion.p>

            {/* Trust badges */}
            <motion.div
              className="flex flex-wrap gap-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                Loved by customers
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" />
                Fast delivery (20–30 mins)
              </div>
            </motion.div>

            {/* Info pills */}
            <motion.div
              className="flex flex-wrap gap-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  {settings
                    ? `${formatTime(settings.opening_time)} - ${formatTime(settings.closing_time)}`
                    : '10 AM - 10 PM'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{settings?.delivery_area || 'Tamale'}</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link to="/menu">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full md:w-auto text-base md:text-lg px-8 md:px-10 py-6 md:py-7 rounded-2xl"
                  >
                    Order Now
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:hidden">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-2.5 bg-white/60 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="section-mobile bg-muted/50">
        <div className="container">
          <ScrollReveal className="text-center mb-10">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Simple Process
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-2">
              How It Works
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: UtensilsCrossed,
                title: 'Choose your meal',
                desc: 'Browse our menu and pick your favorite dishes. All made fresh daily.',
              },
              {
                icon: ChefHat,
                title: 'We prepare it fresh',
                desc: 'Our chefs cook your order with care using the finest ingredients.',
              },
              {
                icon: Truck,
                title: 'We deliver to your door',
                desc: 'Your food arrives hot and ready. Enjoy in 20–30 minutes.',
              },
            ].map((step, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <motion.div
                  className="bg-card rounded-2xl p-6 md:p-8 text-center shadow-lg border border-border/50 h-full"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-lg mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">{step.desc}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. MOST POPULAR DISHES */}
      <section className="section-mobile">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <ScrollReveal>
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                Most Loved
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
                Popular Dishes
              </h2>
            </ScrollReveal>
            <Link to="/menu" className="hidden md:block">
              <Button variant="outline" size="sm" className="rounded-xl">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {menuLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {popularItems.map((item, i) => (
                <ScrollReveal key={item.id} delay={i * 0.08}>
                  <MenuItemCard item={item} onAddToCart={addToCart} />
                </ScrollReveal>
              ))}
            </div>
          )}

          <div className="mt-6 text-center md:hidden">
            <Link to="/menu">
              <Button variant="outline" className="w-full rounded-xl">
                View Full Menu
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. WHY PEOPLE LOVE LUXE BITE */}
      <section className="section-mobile relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-orange-50/70 to-background" />
        <div className="absolute -right-24 -top-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 w-64 h-64 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="container relative">
          <ScrollReveal className="text-center mb-10">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Why Choose Us
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-2">
              Why People Love Luxe Bite
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: Star, title: 'Fresh ingredients', desc: 'We source the best quality ingredients for every dish.' },
              { icon: Truck, title: 'Fast delivery', desc: 'Your food arrives hot within 20–30 minutes.' },
              { icon: CreditCard, title: 'Affordable prices', desc: 'Great taste without breaking the bank.' },
              { icon: Package, title: 'Easy ordering', desc: 'Simple process from browse to delivery.' },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <motion.div
                  className="bg-card rounded-2xl p-6 border border-border/50 shadow-md"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CUSTOMER REVIEWS */}
      <section className="section-mobile">
        <div className="container">
          <ScrollReveal className="text-center mb-10">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Testimonials
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-2">
              What Our Customers Say
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <motion.div
                  className="bg-card rounded-2xl p-6 border border-border/50 shadow-md h-full"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground/90 text-sm md:text-base mb-4">"{t.text}"</p>
                  <p className="text-muted-foreground text-sm font-medium">— {t.name}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. MID-PAGE CTA */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(220,90,50,0.9) 0%, rgba(180,70,40,0.85) 100%)',
          }}
        />
        <div className="container relative px-5 md:px-8">
          <ScrollReveal className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              HUNGRY ALREADY? LET'S FIX THAT.
            </h2>
            <p className="text-white/90 text-base md:text-lg mb-8">
              Order your favorite Ghanaian dishes now. Fresh, fast, and delivered to your door.
            </p>
            <Link to="/menu">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 text-lg px-10 py-6 rounded-2xl font-bold"
                >
                  Order Your Meal Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </motion.div>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* 7. DELIVERY & PAYMENT INFO */}
      <section className="section-mobile bg-muted/50">
        <div className="container">
          <ScrollReveal className="text-center mb-8">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Delivery Info
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-2">
              Delivery & Payment
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <ScrollReveal delay={0}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">Delivery Areas</h3>
                  <p className="text-muted-foreground text-sm">
                    {settings?.delivery_area || 'Tamale'} and surrounding areas
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">Delivery Time</h3>
                  <p className="text-muted-foreground text-sm">20–30 mins • Same-day delivery</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">Payment</h3>
                  <p className="text-muted-foreground text-sm">Mobile Money (MTN, Vodafone, AirtelTigo)</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-secondary text-secondary-foreground py-12 px-5 safe-bottom">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="font-display font-bold text-2xl">
                <span className="text-primary">Luxe</span> Bite
              </span>
              <p className="text-secondary-foreground/80 text-sm mt-2">
                Authentic Ghanaian Cuisine
              </p>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-3">Hours</h4>
              <p className="text-secondary-foreground/80 text-sm">
                {settings
                  ? `${formatTime(settings.opening_time)} - ${formatTime(settings.closing_time)}`
                  : '10 AM - 10 PM'}
              </p>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-3">Contact</h4>
              <a
                href="tel:+233XXXXXXXXX"
                className="flex items-center gap-2 text-secondary-foreground/80 text-sm hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4" />
                +233 XX XXX XXXX
              </a>
              <a
                href="https://wa.me/233XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-secondary-foreground/80 text-sm hover:text-primary transition-colors mt-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>

            <div>
              <h4 className="font-display font-semibold mb-3">Follow Us</h4>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="text-secondary-foreground/80 hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-secondary-foreground/80 hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-secondary-foreground/20 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <p className="text-secondary-foreground/70 text-sm">
              © {new Date().getFullYear()} Luxe Bite • {settings?.delivery_area || 'Tamale'}, Ghana
            </p>
            <p className="text-secondary-foreground/70 text-sm">
              Built by <span className="font-semibold text-primary">Gh0sT-Tech</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
