import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartItem } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';

interface CartItemCardProps {
  item: CartItem;
}

const CartItemCard = ({ item }: CartItemCardProps) => {
  const { updateQuantity, updateInstructions, removeItem } = useCart();

  return (
    <div className="card-elevated p-4 animate-fade-in">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display text-lg font-semibold">{item.name}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-primary font-bold mb-3">
            GHC {(Number(item.price) * item.quantity).toFixed(2)}
          </p>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{item.quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              @ GHC {Number(item.price).toFixed(2)} each
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <Input
          placeholder="Special instructions (e.g., extra pepper, no onions)"
          value={item.special_instructions || ''}
          onChange={(e) => updateInstructions(item.id, e.target.value)}
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default CartItemCard;
