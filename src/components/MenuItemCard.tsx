import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Plus, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/hooks/useMenu';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem) => void;
}

const MenuItemCard = ({ item, onAddToCart }: MenuItemCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className="food-card group"
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Best Seller Badge */}
        {item.is_popular && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg">
            <Flame className="h-3 w-3" />
            Best Seller
          </div>
        )}
        
        {/* Unavailable Overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-muted-foreground font-medium">Currently Unavailable</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-semibold text-foreground text-base leading-tight">
            {item.name}
          </h3>
          <span className="price-tag text-lg whitespace-nowrap">
            GH₵{item.price}
          </span>
        </div>
        
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {item.description}
        </p>
        
        <Button
          variant="default"
          size="sm"
          className="w-full"
          disabled={!item.is_available}
          onClick={() => onAddToCart?.(item)}
        >
          <Plus className="h-4 w-4" />
          Add to Cart
        </Button>
      </div>
    </motion.div>
  );
};

export default MenuItemCard;
