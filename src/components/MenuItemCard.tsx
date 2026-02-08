import { Plus, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useState } from 'react';

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard = ({ item }: MenuItemCardProps) => {
  const { addItem } = useCart();
  const [imageError, setImageError] = useState(false);

  const handleAddToCart = () => {
    addItem(item);
    toast.success(`${item.name} added to cart!`, {
      description: `GHC ${item.price.toFixed(2)}`,
    });
  };

  return (
    <div className="card-elevated overflow-hidden group animate-fade-in">
      <div className="relative h-40 bg-muted overflow-hidden">
        {item.image_url && !imageError ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ImageOff className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        {item.is_weekend_only && (
          <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-semibold px-2 py-1 rounded-full">
            Weekend Only
          </span>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-lg font-semibold text-foreground line-clamp-1">
            {item.name}
          </h3>
          <span className="font-body text-lg font-bold text-primary whitespace-nowrap">
            GHC {item.price.toFixed(2)}
          </span>
        </div>
        
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {item.description}
          </p>
        )}
        
        <Button
          onClick={handleAddToCart}
          className="w-full btn-primary-gradient"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

export default MenuItemCard;
