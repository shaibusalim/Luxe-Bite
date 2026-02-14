import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { MenuItem } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Returns a function to add items to cart. Requires user to be logged in.
 * If not logged in, shows toast and redirects to /auth.
 */
export const useAddToCart = () => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  return useCallback(
    (item: MenuItem, quantity?: number, instructions?: string) => {
      if (!user) {
        toast.error('Please sign in to add items to your cart');
        navigate('/auth', { state: { from: window.location.pathname } });
        return;
      }
      addItem(item, quantity, instructions);
      toast.success(`${item.name} added to cart`);
    },
    [user, addItem, navigate]
  );
};
